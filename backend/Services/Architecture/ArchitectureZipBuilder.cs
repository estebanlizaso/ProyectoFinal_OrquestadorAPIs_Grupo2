using System.IO.Compression;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using OrquestadorApi.DTOs;

namespace OrquestadorApi.Services.Architecture;

public sealed class ArchitectureZipBuilder : IArchitecturePackageBuilder
{
    private static readonly Regex UnsafeFolderNameChars =
        new(@"[\\/:*?""<>|]+", RegexOptions.Compiled);

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true
    };

    public string BuildFileName() => "architecture.zip";

    public string BuildProjectFolderName(string projectName)
    {
        var sanitized = UnsafeFolderNameChars
            .Replace(projectName.Trim(), "-")
            .Trim(' ', '.', '-');

        return string.IsNullOrWhiteSpace(sanitized) ? "proyecto" : sanitized;
    }

    public string ResolveSourceMimeType(string language) =>
        string.Equals(language, "dotnet", StringComparison.OrdinalIgnoreCase)
            ? "text/plain"
            : "text/x-python";

    public byte[] BuildZip(
        ArchitectureResponse architecture,
        IReadOnlyList<OrchestrationNodeResponse> nodes,
        IReadOnlyList<OrchestrationRelationResponse> relations,
        JsonElement? postmanCollection = null)
    {
        architecture = architecture with
        {
            ProjectFiles = StartupScriptBuilder.WithTemplate(architecture.Language, architecture.ProjectFiles)
        };
        ArchitectureProjectValidator.Validate(architecture);
        using var memory = new MemoryStream();
        using (var archive = new ZipArchive(memory, ZipArchiveMode.Create, leaveOpen: true))
        {
            var root = $"project-{architecture.ProjectId}-architecture";
            WriteEntry(archive, $"{root}/README.md", BuildReadme(architecture));
            WriteEntry(archive, $"{root}/nodes.json", BuildNodesJson(architecture, nodes, relations));
            WriteEntry(archive, $"{root}/.gitignore", ".env\n.venv/\n__pycache__/\nbin/\nobj/\n");
            foreach (var file in architecture.ProjectFiles!)
            {
                WriteEntry(archive, $"{root}/{file.Path}", NormalizeNewLines(file.Content));
            }

            if (postmanCollection is { } collection &&
                collection.ValueKind is not JsonValueKind.Undefined and not JsonValueKind.Null)
            {
                WriteEntry(
                    archive,
                    $"{root}/postman_collection.json",
                    collection.GetRawText() + "\n");
            }

            if (!string.IsNullOrWhiteSpace(architecture.EnvExample))
            {
                WriteEntry(archive, $"{root}/.env.example", architecture.EnvExample.TrimEnd() + "\n");
            }

        }

        return memory.ToArray();
    }

    private static string BuildNodesJson(
        ArchitectureResponse architecture,
        IReadOnlyList<OrchestrationNodeResponse> nodes,
        IReadOnlyList<OrchestrationRelationResponse> relations)
    {
        var payload = new
        {
            projectId = architecture.ProjectId,
            contextId = architecture.ContextId,
            mapVersion = architecture.MapVersion,
            language = architecture.Language,
            generatedAt = architecture.GeneratedAt,
            nodes,
            relations
        };

        return JsonSerializer.Serialize(payload, JsonOptions) + "\n";
    }

    private static void WriteEntry(ZipArchive archive, string entryName, string content)
    {
        var entry = archive.CreateEntry(entryName, CompressionLevel.Optimal);
        if (entryName.EndsWith("/run.sh", StringComparison.Ordinal))
        {
            // Unix regular file with mode 0755; bash run.sh also works without executable-bit support.
            entry.ExternalAttributes = unchecked((int)0x81ED0000);
        }
        using var writer = new StreamWriter(entry.Open(), new UTF8Encoding(encoderShouldEmitUTF8Identifier: false));
        writer.Write(content);
    }

    private static string BuildReadme(ArchitectureResponse architecture)
    {
        var builder = new StringBuilder();
        builder.AppendLine($"# Arquitectura del proyecto {architecture.ProjectId}");
        builder.AppendLine();
        builder.AppendLine($"- Lenguaje: `{architecture.Language}`");
        builder.AppendLine($"- Versión del mapa: `{architecture.MapVersion}`");
        builder.AppendLine($"- Generado: `{architecture.GeneratedAt:O}`");
        builder.AppendLine("- Mapa de orquestación: `nodes.json`");
        builder.AppendLine("- Collection Postman: `postman_collection.json`");
        builder.AppendLine();
        builder.AppendLine("## Resumen");
        builder.AppendLine();
        builder.AppendLine(architecture.Summary.Trim());
        builder.AppendLine();
        builder.AppendLine("## Ejecutar el proyecto");
        builder.AppendLine();
        builder.AppendLine("Desde esta carpeta, con Python 3.10+ o el SDK .NET 10 según el lenguaje:");
        builder.AppendLine();
        builder.AppendLine("Revisá el script y ejecutá (macOS/Linux, o un entorno Bash compatible en Windows):");
        builder.AppendLine();
        builder.AppendLine("```sh");
        builder.AppendLine("bash run.sh");
        builder.AppendLine("```");
        builder.AppendLine();
        builder.AppendLine("El script prepara las dependencias del proyecto y lo inicia en primer plano. " +
            "Está generado desde una plantilla fija del backend, no por la IA. No instala Python/.NET en el sistema ni requiere sudo. " +
            "Para APIs, muestra la URL configurada; consultá `USAGE.md` para el endpoint y un ejemplo curl: " +
            "esperá a que el servidor indique que está escuchando y hacé la petición desde otra terminal o Postman. " +
            "Detenelo con Ctrl+C. La instalación inicial de dependencias puede requerir acceso a Internet.");
        builder.AppendLine();
        builder.AppendLine("Las APIs usan por defecto `http://127.0.0.1:5000`. Podés cambiarlo con `HOST=127.0.0.1 PORT=8080 bash run.sh`. " +
            "Estos valores del proceso prevalecen sobre `.env`; el script no ejecuta ni sobrescribe ese archivo. " +
            "Para argumentos CLI, usá `bash run.sh argumentos...`. Las instrucciones específicas están en `USAGE.md`.");
        builder.AppendLine();
        builder.AppendLine("### Alternativa manual");
        builder.AppendLine();
        builder.AppendLine("```sh");
        if (architecture.Language == "python")
        {
            builder.AppendLine("python3 -m venv .venv");
            builder.AppendLine("# Activar .venv (Windows: .venv\\Scripts\\activate; macOS/Linux: source .venv/bin/activate)");
            builder.AppendLine("python3 -m pip install -r requirements.txt");
            builder.AppendLine("python3 main.py  # también: python3 -m main");
        }
        else
        {
            builder.AppendLine("dotnet restore Integration.csproj");
            builder.AppendLine("dotnet run --project Integration.csproj");
        }
        builder.AppendLine("```");
        builder.AppendLine();
        builder.AppendLine("Si existe `.env.example`, copiá sus valores a un `.env` y completá la configuración. " +
            "El punto de entrada carga ese archivo. Revisá los supuestos y mocks antes de habilitar llamadas reales. " +
            "La estructura fue validada; el backend no ejecutó ni verificó la integración contra servicios externos.");
        builder.AppendLine();
        builder.AppendLine("## Archivos del proyecto");
        builder.AppendLine();
        foreach (var file in architecture.ProjectFiles!)
        {
            builder.AppendLine($"- `{file.Path}`");
        }
        builder.AppendLine();
        builder.AppendLine("## Contextos");
        builder.AppendLine();

        foreach (var context in architecture.Contexts)
        {
            builder.AppendLine($"### {context.Name} (`{context.Key}`)");
            builder.AppendLine();
            builder.AppendLine(context.Summary.Trim());
            builder.AppendLine($"Archivo principal: `{context.FilePath}`.");
            builder.AppendLine();
            foreach (var assumption in context.Assumptions)
                builder.AppendLine($"- Supuesto: {assumption}");
            foreach (var warning in context.Warnings)
                builder.AppendLine($"- Advertencia: {warning}");

            if (context.Dependencies.Count > 0)
            {
                builder.AppendLine("Dependencias:");
                foreach (var dependency in context.Dependencies)
                {
                    builder.AppendLine($"- {dependency}");
                }

                builder.AppendLine();
            }
        }

        if (architecture.Warnings.Count > 0)
        {
            builder.AppendLine("## Advertencias");
            builder.AppendLine();
            foreach (var warning in architecture.Warnings)
            {
                builder.AppendLine($"- {warning}");
            }
        }

        return builder.ToString();
    }

    private static string NormalizeNewLines(string content) =>
        content.Replace("\r\n", "\n", StringComparison.Ordinal).TrimEnd() + "\n";
}
