using System.IO.Compression;
using OrquestadorApi.DTOs;
using OrquestadorApi.Services.AI;
using OrquestadorApi.Services.Architecture;
using Xunit;

namespace OrquestadorApi.Tests;

public class ArchitecturePackageTests
{
    private readonly ArchitectureZipBuilder _builder = new();

    private static ArchitectureResponse PythonProject() => new(
        1, 2, "python", 1, DateTime.UtcNow, "Flujo mock conectado", null,
        [new("api-legacy", "Legacy", "Mock", "def consultar():\n    return {'id': 42}\n", [], [], [], ["Mock local"], "buscar_cliente.py")],
        [], false, ProjectFiles:
        [new("main.py", "from buscar_cliente import consultar\n\ndef main():\n    print(consultar())\n\nif __name__ == '__main__':\n    main()\n"),
         new("requirements.txt", ""),
         new("run.sh", "#!/usr/bin/env bash\nset -Eeuo pipefail\ncd -- \"$(dirname -- \"${BASH_SOURCE[0]}\")\"\ncommand -v python3 >/dev/null || { echo 'Instalá Python 3.10+' >&2; exit 1; }\npython3 -m venv .venv\n.venv/bin/python -m pip install -r requirements.txt\nexec .venv/bin/python main.py\n"),
         new("buscar_cliente.py", "def consultar():\n    return {'id': 42}\n")]);

    [Fact]
    public void Zip_contains_entrypoint_dependencies_and_importable_contexts()
    {
        var architecture = PythonProject();
        using var stream = new MemoryStream(_builder.BuildZip(architecture, [], []));
        using var zip = new ZipArchive(stream);
        const string root = "project-2-architecture/";
        Assert.NotNull(zip.GetEntry(root + "requirements.txt"));
        Assert.NotNull(zip.GetEntry(root + "buscar_cliente.py"));
        Assert.Null(zip.GetEntry(root + "repository-blueprint.json"));
        Assert.NotNull(zip.GetEntry(root + ".gitignore"));
        var startup = zip.GetEntry(root + "run.sh");
        Assert.NotNull(startup);
        Assert.Equal(0x81ED, (startup.ExternalAttributes >> 16) & 0xFFFF);
        using var main = new StreamReader(zip.GetEntry(root + "main.py")!.Open());
        Assert.Contains("from buscar_cliente import consultar", main.ReadToEnd());
        using var readme = new StreamReader(zip.GetEntry(root + "README.md")!.Open());
        var content = readme.ReadToEnd();
        Assert.Contains("python3 main.py", content);
        Assert.Contains("bash run.sh", content);
        Assert.Contains("Mock local", content);
    }

    [Fact]
    public void Dotnet_package_requires_project_and_single_entrypoint_file()
    {
        var architecture = PythonProject() with
        {
            Language = "dotnet",
            Contexts = [],
            ProjectFiles = [new("Program.cs", "Console.WriteLine(42);"),
                new("run.sh", "#!/usr/bin/env bash\nset -Eeuo pipefail\ncd -- \"$(dirname -- \"${BASH_SOURCE[0]}\")\"\ncommand -v dotnet >/dev/null || { echo 'Instalá SDK .NET 10' >&2; exit 1; }\ndotnet restore Integration.csproj\nexec dotnet run --no-restore --project Integration.csproj\n"),
                new("Integration.csproj", "<Project Sdk=\"Microsoft.NET.Sdk\"><PropertyGroup><OutputType>Exe</OutputType><TargetFramework>net10.0</TargetFramework></PropertyGroup></Project>")]
        };
        using var stream = new MemoryStream(_builder.BuildZip(architecture, [], []));
        using var zip = new ZipArchive(stream);
        Assert.NotNull(zip.GetEntry("project-2-architecture/Integration.csproj"));
        Assert.NotNull(zip.GetEntry("project-2-architecture/run.sh"));
        using var readme = new StreamReader(zip.GetEntry("project-2-architecture/README.md")!.Open());
        Assert.Contains("dotnet run --project Integration.csproj", readme.ReadToEnd());
    }

    [Theory]
    [InlineData("../escape.py")]
    [InlineData("/absolute.py")]
    [InlineData("folder/../../escape.py")]
    [InlineData("folder\\escape.py")]
    [InlineData(".env")]
    [InlineData("README.md")]
    [InlineData("README.md/child.py")]
    [InlineData("buscar_cliente.py")]
    [InlineData("MAIN.py")]
    [InlineData("main.py/child.py")]
    public void Unsafe_reserved_and_conflicting_paths_are_rejected(string path)
    {
        var architecture = PythonProject();
        architecture = architecture with { ProjectFiles = [.. architecture.ProjectFiles!, new(path, "pass")] };
        Assert.Throws<AiProviderException>(() => _builder.BuildZip(architecture, [], []));
    }

    [Fact]
    public void Missing_entrypoint_is_rejected_instead_of_packaging_loose_files()
    {
        var architecture = PythonProject() with { ProjectFiles = [new("requirements.txt", "")] };
        Assert.Throws<AiProviderException>(() => _builder.BuildZip(architecture, [], []));
        Assert.Throws<AiProviderException>(() => _builder.BuildZip(architecture with { ProjectFiles = null }, [], []));
    }

    [Fact]
    public void Multiple_contexts_can_share_one_implementation_file()
    {
        var architecture = PythonProject();
        architecture = architecture with { Contexts = [.. architecture.Contexts, architecture.Contexts[0] with { Key = "api_legacy" }] };
        using var stream = new MemoryStream(_builder.BuildZip(architecture, [], []));
        using var zip = new ZipArchive(stream);
        Assert.Single(zip.Entries, entry => entry.FullName.EndsWith("/buscar_cliente.py", StringComparison.Ordinal));
    }

    [Fact]
    public void Oversized_auxiliary_files_are_rejected()
    {
        var architecture = PythonProject();
        architecture = architecture with { ProjectFiles = [.. architecture.ProjectFiles!, new("large.py", new string('x', 200_001))] };
        Assert.Throws<AiProviderException>(() => _builder.BuildZip(architecture, [], []));
    }

    [Fact]
    public void Generator_can_choose_additional_shared_modules_without_a_planner_blueprint()
    {
        var architecture = PythonProject();
        architecture = architecture with { ProjectFiles = [.. architecture.ProjectFiles!, new("common/contracts.py", "class Cliente:\n    pass\n")] };
        using var stream = new MemoryStream(_builder.BuildZip(architecture, [], []));
        using var zip = new ZipArchive(stream);
        Assert.NotNull(zip.GetEntry("project-2-architecture/common/contracts.py"));
    }

    [Fact]
    public void Context_metadata_must_reference_a_delivered_file()
    {
        var architecture = PythonProject();
        architecture = architecture with
        {
            Contexts = [architecture.Contexts[0] with { FilePath = "missing.py" }]
        };
        Assert.Throws<AiProviderException>(() => _builder.BuildZip(architecture, [], []));
    }

    [Theory]
    [InlineData("python", null)]
    [InlineData("python", "")]
    [InlineData("python", "   ")]
    [InlineData("dotnet", null)]
    [InlineData("dotnet", "")]
    [InlineData("dotnet", "   ")]
    public void Startup_script_is_required_and_cannot_be_empty(string language, string? script)
    {
        ArchitectureProjectFile[] files = language == "python"
            ? [new("main.py", "print('mock')"), new("requirements.txt", "")]
            : [new("Program.cs", "Console.WriteLine(42);"), new("Integration.csproj", "<Project />")];
        if (script is not null) files = [.. files, new("run.sh", script)];
        var error = Assert.Throws<AiProviderException>(() => ArchitectureProjectValidator.ValidateFiles(language, files));
        Assert.Contains("run.sh", error.Message);
    }

    [Fact]
    public void Startup_script_is_saved_with_unix_line_endings()
    {
        var architecture = PythonProject();
        architecture = architecture with
        {
            ProjectFiles = architecture.ProjectFiles!.Select(file => file.Path == "run.sh"
                ? file with { Content = file.Content.Replace("\n", "\r\n", StringComparison.Ordinal) } : file).ToList()
        };
        using var zip = new ZipArchive(new MemoryStream(_builder.BuildZip(architecture, [], [])));
        using var script = new StreamReader(zip.GetEntry("project-2-architecture/run.sh")!.Open());
        var content = script.ReadToEnd();
        Assert.StartsWith("#!/usr/bin/env bash\n", content);
        Assert.DoesNotContain("\r", content);
    }
}
