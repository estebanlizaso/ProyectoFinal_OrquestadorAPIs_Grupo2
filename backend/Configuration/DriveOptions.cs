namespace OrquestadorApi.Configuration;

public class DriveOptions
{
    public const string SectionName = "Drive";

    public bool Enabled { get; set; }

    public string? RootFolderId { get; set; }

    /// <summary>
    /// JSON completo de la Service Account. En Drive personal suele fallar al crear archivos (sin cuota).
    /// </summary>
    public string? CredentialsJson { get; set; }

    /// <summary>
    /// Ruta a un archivo JSON de Service Account (relativa al ContentRoot o absoluta).
    /// </summary>
    public string? CredentialsPath { get; set; }

    /// <summary>
    /// OAuth de tu usuario de Google (recomendado para Drive personal).
    /// </summary>
    public string? OAuthClientId { get; set; }

    public string? OAuthClientSecret { get; set; }

    public string? OAuthRefreshToken { get; set; }

    public bool HasServiceAccount =>
        !string.IsNullOrWhiteSpace(CredentialsJson) || !string.IsNullOrWhiteSpace(CredentialsPath);

    public bool HasUserOAuth =>
        !string.IsNullOrWhiteSpace(OAuthClientId) &&
        !string.IsNullOrWhiteSpace(OAuthClientSecret) &&
        !string.IsNullOrWhiteSpace(OAuthRefreshToken);

    public bool IsConfigured =>
        Enabled &&
        !string.IsNullOrWhiteSpace(RootFolderId) &&
        (HasUserOAuth || HasServiceAccount);
}
