using System.ComponentModel.DataAnnotations;

namespace OrquestadorApi.DTOs;

public class SaveNodeInstructionsRequest : IValidatableObject
{
    [Required(AllowEmptyStrings = true)]
    [MaxLength(2000)]
    public required string UserNotes { get; set; }

    [Range(1, int.MaxValue)]
    public int? RelationId { get; set; }

    [MaxLength(10)]
    public string? HttpMethod { get; set; }

    [MaxLength(2048)]
    public string? Path { get; set; }

    [Required]
    [Range(0, int.MaxValue)]
    public int? ExpectedMapVersion { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        var editsOperation = RelationId.HasValue || HttpMethod is not null || Path is not null;
        if (!editsOperation)
        {
            yield break;
        }

        if (!RelationId.HasValue || string.IsNullOrWhiteSpace(HttpMethod) || string.IsNullOrWhiteSpace(Path))
        {
            yield return new ValidationResult(
                "Para editar una operación se requieren relationId, httpMethod y path.",
                [nameof(RelationId), nameof(HttpMethod), nameof(Path)]);
        }

        if (HttpMethod is not null && !IsSupportedMethod(HttpMethod))
        {
            yield return new ValidationResult("Método HTTP no permitido.", [nameof(HttpMethod)]);
        }

        if (Path is not null && !IsValidPath(Path))
        {
            yield return new ValidationResult(
                "La ruta debe comenzar con / y no contener espacios, fragmentos, query strings ni una URL absoluta.",
                [nameof(Path)]);
        }
    }

    private static bool IsSupportedMethod(string method) => method.Trim().ToUpperInvariant() is
        "GET" or "POST" or "PUT" or "PATCH" or "DELETE" or "HEAD" or "OPTIONS";

    private static bool IsValidPath(string path)
    {
        var value = path.Trim();
        return value.StartsWith('/') && !value.StartsWith("//", StringComparison.Ordinal) &&
            !path.Any(char.IsControl) &&
            !value.Any(character => char.IsWhiteSpace(character) || char.IsControl(character) ||
                character is '?' or '#' or '\\');
    }
}
