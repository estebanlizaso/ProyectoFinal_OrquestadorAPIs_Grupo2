using System.IO.Compression;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using OrquestadorApi.DTOs;

namespace OrquestadorApi.Services.Architecture;

public sealed class ArchitectureZipBuilder : IArchitecturePackageBuilder
{
    private static readonly Regex UnsafeFileNameChars =
        new(@"[^A-Za-z0-9._-]+", RegexOptions.Compiled);

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true
    };

    public string BuildFileName(int projectId) =>
        $"project-{projectId}-architecture.zip";

    public byte[] BuildZip(
        ArchitectureResponse architecture,
        IReadOnlyList<OrchestrationNodeResponse> nodes,
        IReadOnlyList<OrchestrationRelationResponse> relations)
    {
        using var memory = new MemoryStream();
        using (var archive = new ZipArchive(memory, ZipArchiveMode.Create, leaveOpen: true))
        {
            var root = $"project-{architecture.ProjectId}-architecture";
            WriteEntry(archive, $"{root}/README.md", BuildReadme(architecture));
            WriteEntry(archive, $"{root}/nodes.json", BuildNodesJson(architecture, nodes, relations));

            if (!string.IsNullOrWhiteSpace(architecture.EnvExample))
            {
                WriteEntry(archive, $"{root}/.env.example", architecture.EnvExample.TrimEnd() + "\n");
            }

            var extension = ResolveExtension(architecture.Language);
            var usedNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var context in architecture.Contexts)
            {
                var fileName = EnsureUniqueFileName(
                    SanitizeFileName(context.Key) + extension,
                    usedNames);
                WriteEntry(archive, $"{root}/{fileName}", NormalizeNewLines(context.Code));
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
        builder.AppendLine();
        builder.AppendLine("## Resumen");
        builder.AppendLine();
        builder.AppendLine(architecture.Summary.Trim());
        builder.AppendLine();
        builder.AppendLine("## Contextos");
        builder.AppendLine();

        foreach (var context in architecture.Contexts)
        {
            builder.AppendLine($"### {context.Name} (`{context.Key}`)");
            builder.AppendLine();
            builder.AppendLine(context.Summary.Trim());
            builder.AppendLine();

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

    private static string ResolveExtension(string language) =>
        string.Equals(language, "dotnet", StringComparison.OrdinalIgnoreCase)
            ? ".cs"
            : ".py";

    private static string SanitizeFileName(string value)
    {
        var sanitized = UnsafeFileNameChars.Replace(value.Trim(), "-").Trim('-', '.');
        return string.IsNullOrWhiteSpace(sanitized) ? "context" : sanitized;
    }

    private static string EnsureUniqueFileName(string fileName, HashSet<string> usedNames)
    {
        if (usedNames.Add(fileName))
        {
            return fileName;
        }

        var extension = Path.GetExtension(fileName);
        var stem = Path.GetFileNameWithoutExtension(fileName);
        var index = 2;

        while (!usedNames.Add($"{stem}-{index}{extension}"))
        {
            index++;
        }

        return $"{stem}-{index}{extension}";
    }

    private static string NormalizeNewLines(string content) =>
        content.Replace("\r\n", "\n", StringComparison.Ordinal).TrimEnd() + "\n";
}
