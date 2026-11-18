using OrquestadorApi.DTOs;
using OrquestadorApi.Services.AI;

namespace OrquestadorApi.Services.Architecture;

public static class StartupScriptBuilder
{
    private static readonly string PythonTemplate = LoadTemplate("python");
    private static readonly string DotnetTemplate = LoadTemplate("dotnet");

    public static string ForLanguage(string language) => language switch
    {
        "python" => PythonTemplate,
        "dotnet" => DotnetTemplate,
        _ => throw new AiProviderException($"No existe una plantilla de inicio para el lenguaje '{language}'.")
    };

    public static IReadOnlyList<ArchitectureProjectFile> WithTemplate(
        string language, IReadOnlyList<ArchitectureProjectFile>? files)
    {
        if (files is null)
            throw new AiProviderException("La arquitectura no incluye los archivos del proyecto.");

        // Older models may still return run.sh. Never ship their content, even if malformed.
        // Keep other invalid entries so the regular path/content validation can reject them.
        return files.Where(file => file is null || !string.Equals(file.Path, "run.sh", StringComparison.OrdinalIgnoreCase))
            .Append(new ArchitectureProjectFile("run.sh", ForLanguage(language))).ToList();
    }

    private static string LoadTemplate(string language)
    {
        using var stream = typeof(StartupScriptBuilder).Assembly.GetManifestResourceStream($"StartupScripts.{language}.run.sh")
            ?? throw new InvalidOperationException($"No se encontró la plantilla de inicio '{language}'.");
        using var reader = new StreamReader(stream);
        return reader.ReadToEnd().Replace("\r\n", "\n", StringComparison.Ordinal).TrimEnd() + "\n";
    }
}
