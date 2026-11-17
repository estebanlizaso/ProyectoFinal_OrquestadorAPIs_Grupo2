using System.Diagnostics;
using OrquestadorApi.DTOs;
using OrquestadorApi.Services.AI;
using OrquestadorApi.Services.Architecture;
using Xunit;

namespace OrquestadorApi.Tests;

public sealed class BashTheoryAttribute : TheoryAttribute
{
    public BashTheoryAttribute()
    {
        if (!File.Exists("/bin/bash")) Skip = "Requires Bash (macOS/Linux).";
    }
}

public class StartupScriptTests
{
    [Theory]
    [InlineData("python")]
    [InlineData("dotnet")]
    public void Backend_adds_one_trusted_script_and_discards_model_versions(string language)
    {
        var files = StartupScriptBuilder.WithTemplate(language,
            [new("run.sh", "if true; then\nend\nexec dotnet dotnet run"), new("RUN.SH", "invalid"), new("USAGE.md", "Instrucciones")]);
        var script = Assert.Single(files, file => file.Path.Equals("run.sh", StringComparison.OrdinalIgnoreCase));
        Assert.Equal(StartupScriptBuilder.ForLanguage(language), script.Content);
        Assert.DoesNotContain("dotnet dotnet", script.Content);
        Assert.Equal("Instrucciones", files.Single(file => file.Path == "USAGE.md").Content);
        Assert.Single(StartupScriptBuilder.WithTemplate(language, []));
        Assert.Single(StartupScriptBuilder.WithTemplate(language, files), file => file.Path == "run.sh");
    }

    [Fact]
    public void Unsupported_language_does_not_silently_use_python() =>
        Assert.Throws<AiProviderException>(() => StartupScriptBuilder.ForLanguage("unknown"));

    [BashTheory]
    [InlineData("python")]
    [InlineData("dotnet")]
    public async Task Templates_pass_bash_syntax_validation(string language)
    {
        using var fixture = new ScriptFixture(language);
        var result = await fixture.RunAsync(syntaxOnly: true);
        Assert.True(result.ExitCode == 0, result.Error);
        Assert.Empty(fixture.Log);
    }

    [BashTheory]
    [InlineData("python")]
    [InlineData("dotnet")]
    public async Task Templates_install_and_start_from_another_directory_with_spaces(string language)
    {
        using var fixture = new ScriptFixture(language);
        fixture.Environment["PORT"] = "8080";
        var result = await fixture.RunAsync();
        Assert.True(result.ExitCode == 0, result.Error);
        Assert.Contains("cwd:" + fixture.ProjectDirectory, fixture.Log);
        Assert.Contains("host:127.0.0.1 port:8080", fixture.Log);
        Assert.Contains("arg:<value with spaces>", fixture.Log);
        Assert.Contains(language == "python" ? "venv:-m pip install -r requirements.txt" : "dotnet:restore Integration.csproj", fixture.Log);
        Assert.Contains(language == "python" ? "venv:main.py --demo value with spaces" :
            "dotnet:run --no-restore --no-launch-profile --project Integration.csproj -- --demo value with spaces", fixture.Log);
        if (language == "dotnet") Assert.Contains("urls:http://127.0.0.1:8080", fixture.Log);
        Assert.False(File.Exists(Path.Combine(fixture.ProjectDirectory, "env-was-executed")));
        Assert.Equal(fixture.EnvContent, File.ReadAllText(Path.Combine(fixture.ProjectDirectory, ".env")));
    }

    [BashTheory]
    [InlineData("python")]
    [InlineData("dotnet")]
    public async Task Installation_failure_stops_before_starting_the_application(string language)
    {
        using var fixture = new ScriptFixture(language);
        fixture.Environment["TEST_INSTALL_EXIT"] = "17";
        var result = await fixture.RunAsync();
        Assert.Equal(17, result.ExitCode);
        Assert.DoesNotContain("venv:main.py", fixture.Log);
        Assert.DoesNotContain("dotnet:run", fixture.Log);
        Assert.DoesNotContain("Iniciando la aplicación", result.Output);
    }

    [BashTheory]
    [InlineData("python", "80")]
    [InlineData("dotnet", "99999")]
    [InlineData("python", "5000; echo injected")]
    [InlineData("dotnet", "5000; echo injected")]
    public async Task Invalid_port_stops_before_installation(string language, string port)
    {
        using var fixture = new ScriptFixture(language);
        fixture.Environment["PORT"] = port;
        var result = await fixture.RunAsync();
        Assert.NotEqual(0, result.ExitCode);
        Assert.Contains("PORT", result.Error);
        Assert.DoesNotContain("pip install", fixture.Log);
        Assert.DoesNotContain("dotnet:restore", fixture.Log);
    }

    [BashTheory]
    [InlineData("python")]
    [InlineData("dotnet")]
    public async Task Incompatible_runtime_stops_before_installation(string language)
    {
        using var fixture = new ScriptFixture(language);
        fixture.Environment["TEST_PYTHON_EXIT"] = "1";
        fixture.Environment["TEST_SDKS"] = "9.0.100 [/mock/sdk]";
        var result = await fixture.RunAsync();
        Assert.NotEqual(0, result.ExitCode);
        Assert.Contains(language == "python" ? "Python 3.10" : "SDK de .NET 10", result.Error);
        Assert.DoesNotContain("pip install", fixture.Log);
        Assert.DoesNotContain("dotnet:restore", fixture.Log);
    }

    [BashTheory]
    [InlineData("python")]
    public async Task Valid_virtual_environment_is_reused(string language)
    {
        using var fixture = new ScriptFixture(language);
        Assert.Equal(0, (await fixture.RunAsync()).ExitCode);
        Assert.Equal(0, (await fixture.RunAsync()).ExitCode);
        Assert.Single(fixture.Log.Split('\n'), line => line.StartsWith("python3:-m venv", StringComparison.Ordinal));
        Assert.Equal(2, fixture.Log.Split('\n').Count(line => line.StartsWith("venv:main.py", StringComparison.Ordinal)));
    }

    // Execute only our trusted templates with fake runtimes: no installs, network or model code.
    private sealed class ScriptFixture : IDisposable
    {
        private readonly string _root = Path.Combine(Path.GetTempPath(), "opencode", "startup-test-" + Guid.NewGuid().ToString("N"));
        public string ProjectDirectory => Path.Combine(_root, "project with spaces");
        public Dictionary<string, string> Environment { get; } = [];
        public string Log => File.Exists(Path.Combine(_root, "calls.log")) ? File.ReadAllText(Path.Combine(_root, "calls.log")) : "";
        public string EnvContent => "touch env-was-executed\nTOKEN=do-not-print-or-overwrite\n";

        public ScriptFixture(string language)
        {
            Directory.CreateDirectory(ProjectDirectory);
            Directory.CreateDirectory(Path.Combine(_root, "bin"));
            File.WriteAllText(Path.Combine(ProjectDirectory, "run.sh"), StartupScriptBuilder.ForLanguage(language));
            foreach (var file in new[] { "main.py", "requirements.txt", "Program.cs", "Integration.csproj" })
                File.WriteAllText(Path.Combine(ProjectDirectory, file), "fixture");
            File.WriteAllText(Path.Combine(ProjectDirectory, ".env"), EnvContent);
            WriteExecutable("bin/dotnet", """
                #!/bin/bash
                printf 'dotnet:%s\ncwd:%s\nhost:%s port:%s\nurls:%s\n' "$*" "$PWD" "${HOST:-}" "${PORT:-}" "${ASPNETCORE_URLS:-}" >> "$TEST_LOG"
                printf 'arg:<%s>\n' "$@" >> "$TEST_LOG"
                case "$1" in
                    --list-sdks) printf '%s\n' "${TEST_SDKS-10.0.100 [/mock/sdk]}" ;;
                    restore) exit "${TEST_INSTALL_EXIT:-0}" ;;
                    run) exit 0 ;;
                    *) exit 42 ;;
                esac
                """);
            WriteExecutable("bin/python3", """
                #!/bin/bash
                printf 'python3:%s\n' "$*" >> "$TEST_LOG"
                if [[ "$1" == -c ]]; then exit "${TEST_PYTHON_EXIT:-0}"; fi
                if [[ "$1" == -m && "$2" == venv ]]; then
                    mkdir -p "$3/bin"
                    cp "$TEST_VENV_STUB" "$3/bin/python"
                    chmod +x "$3/bin/python"
                else
                    exit 42
                fi
                """);
            WriteExecutable("venv-stub", """
                #!/bin/bash
                printf 'venv:%s\ncwd:%s\nhost:%s port:%s\n' "$*" "$PWD" "${HOST:-}" "${PORT:-}" >> "$TEST_LOG"
                printf 'arg:<%s>\n' "$@" >> "$TEST_LOG"
                if [[ "$1" == -m && "$2" == pip && "$3" == install ]]; then exit "${TEST_INSTALL_EXIT:-0}"; fi
                exit 0
                """);
        }

        private void WriteExecutable(string path, string content)
        {
            var fullPath = Path.Combine(_root, path);
            File.WriteAllText(fullPath, content + "\n");
            if (!OperatingSystem.IsWindows()) File.SetUnixFileMode(fullPath,
                UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
        }

        public async Task<(int ExitCode, string Output, string Error)> RunAsync(bool syntaxOnly = false)
        {
            var start = new ProcessStartInfo("/bin/bash")
            {
                WorkingDirectory = _root, RedirectStandardOutput = true, RedirectStandardError = true, UseShellExecute = false
            };
            if (syntaxOnly) start.ArgumentList.Add("-n");
            start.ArgumentList.Add(Path.Combine(ProjectDirectory, "run.sh"));
            if (!syntaxOnly)
            {
                start.ArgumentList.Add("--demo");
                start.ArgumentList.Add("value with spaces");
            }
            foreach (var variable in new[] { "HOST", "PORT", "ASPNETCORE_URLS", "TEST_SDKS", "TEST_INSTALL_EXIT", "TEST_PYTHON_EXIT" })
                start.Environment.Remove(variable);
            start.Environment["PATH"] = Path.Combine(_root, "bin") + ":/usr/bin:/bin";
            start.Environment["TEST_LOG"] = Path.Combine(_root, "calls.log");
            start.Environment["TEST_VENV_STUB"] = Path.Combine(_root, "venv-stub");
            foreach (var (key, value) in Environment) start.Environment[key] = value;
            using var process = Process.Start(start)!;
            var output = process.StandardOutput.ReadToEndAsync();
            var error = process.StandardError.ReadToEndAsync();
            using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(15));
            try { await process.WaitForExitAsync(timeout.Token); }
            catch (OperationCanceledException) { process.Kill(entireProcessTree: true); throw; }
            return (process.ExitCode, await output, await error);
        }

        public void Dispose() => Directory.Delete(_root, recursive: true);
    }
}
