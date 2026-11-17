using OrquestadorApi.DTOs;
using OrquestadorApi.Services.AI;
using System.Text.RegularExpressions;

namespace OrquestadorApi.Services.Architecture;

// Structural validation only: never execute model-generated code on the API host.
public static class ArchitectureProjectValidator
{
    private static readonly string[] ReservedPaths =
        ["README.md", "nodes.json", "postman_collection.json", ".env.example", ".gitignore"];

    private static bool IsSafePath(string? path) =>
        !string.IsNullOrWhiteSpace(path) && path.Length <= 180 &&
        Regex.IsMatch(path, @"^[A-Za-z0-9_][A-Za-z0-9_./-]*$") &&
        path.Split('/').All(part => part is not ("" or "." or "..") && !part.EndsWith('.') &&
            !part.StartsWith('.') && !Regex.IsMatch(part, @"^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)", RegexOptions.IgnoreCase)) &&
        !ReservedPaths.Any(reserved => path.Equals(reserved, StringComparison.OrdinalIgnoreCase) ||
            path.StartsWith(reserved + "/", StringComparison.OrdinalIgnoreCase));

    public static void Validate(ArchitectureResponse architecture)
    {
        ValidateFiles(architecture.Language, architecture.ProjectFiles);
        foreach (var context in architecture.Contexts)
        {
            if (context.FilePath is null || !architecture.ProjectFiles!.Any(file => file.Path == context.FilePath))
                throw new AiProviderException($"El contexto '{context.Key}' referencia un archivo inexistente.");
        }
    }

    public static void ValidateFiles(string language, IReadOnlyList<ArchitectureProjectFile>? files)
    {
        if (files is null || files.Count == 0 || files.Count > 30)
            throw new AiProviderException("La arquitectura debe incluir entre 1 y 30 archivos de proyecto.");

        var paths = new HashSet<string>(ReservedPaths, StringComparer.OrdinalIgnoreCase);

        var totalSize = 0L;
        foreach (var file in files)
        {
            if (file is null || !IsSafePath(file.Path) ||
                !paths.Add(file.Path) || file.Content is null)
                throw new AiProviderException("La IA devolvió una ruta de proyecto inválida, reservada o duplicada.");
            if (string.IsNullOrWhiteSpace(file.Content) && file.Path != "requirements.txt" && !file.Path.EndsWith("__init__.py", StringComparison.Ordinal))
                throw new AiProviderException($"La IA devolvió el archivo vacío '{file.Path}'.");
            totalSize += file.Content.Length;
            if (totalSize > 200_000)
                throw new AiProviderException("Los archivos del proyecto superan el tamaño permitido.");
        }

        var required = language == "python"
            ? new[] { "main.py", "requirements.txt", "run.sh", "USAGE.md" }
            : new[] { "Program.cs", "Integration.csproj", "run.sh", "USAGE.md" };
        foreach (var path in required)
        {
            // Exact casing matters on Linux.
            var file = files.FirstOrDefault(file => file.Path == path);
            if (file is null || (path != "requirements.txt" && string.IsNullOrWhiteSpace(file.Content)))
                throw new AiProviderException($"Falta el archivo obligatorio del proyecto '{path}'.");
        }
        foreach (var path in paths)
        {
            if (paths.Any(other => other.StartsWith(path + "/", StringComparison.OrdinalIgnoreCase)))
                throw new AiProviderException("Una ruta del proyecto se usa como archivo y como directorio.");
        }
    }
}
