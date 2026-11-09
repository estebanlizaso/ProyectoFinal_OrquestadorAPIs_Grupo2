using Microsoft.Extensions.Options;

namespace OrquestadorApi.Configuration;

public class AiOptionsValidator : IValidateOptions<AiOptions>
{
    public ValidateOptionsResult Validate(string? name, AiOptions options)
    {
        var errors = new List<string>();

        if (options.IsGemini)
        {
            RequireValue(errors, options.Gemini.BaseUrl, "AI:Gemini:BaseUrl");
            RequireValue(errors, options.Gemini.ApiVersion, "AI:Gemini:ApiVersion");
            RequireValue(errors, options.Gemini.Model, "AI:Gemini:Model");
            RequireValue(errors, options.Gemini.ApiKey, "GEMINI_API_KEY");
            RequireAbsoluteUrl(errors, options.Gemini.BaseUrl, "AI:Gemini:BaseUrl");
        }
        else if (options.IsBdt)
        {
            RequireValue(errors, options.Bdt.BaseUrl, "BDT_API_URL");
            RequireValue(errors, options.Bdt.Model, "AI:Bdt:Model o BDT_MODEL");
            RequireValue(errors, options.Bdt.ApiKey, "BDT_API_KEY");
            RequireAbsoluteUrl(errors, options.Bdt.BaseUrl, "BDT_API_URL");

            if (options.Bdt.ResponseFormat is not
                (BdtOptions.JsonSchemaFormat or BdtOptions.JsonObjectFormat))
            {
                errors.Add(
                    $"AI:Bdt:ResponseFormat debe ser '{BdtOptions.JsonSchemaFormat}' " +
                    $"o '{BdtOptions.JsonObjectFormat}'.");
            }

            if (options.Bdt.MaxTokens is <= 0)
            {
                errors.Add("AI:Bdt:MaxTokens debe ser mayor que 0 si se define.");
            }
        }
        else
        {
            errors.Add(
                $"AI:Provider '{options.Provider}' no es válido. " +
                $"Valores permitidos: {AiOptions.GeminiProvider}, {AiOptions.BdtProvider}.");
        }

        return errors.Count == 0
            ? ValidateOptionsResult.Success
            : ValidateOptionsResult.Fail(errors);
    }

    private static void RequireValue(List<string> errors, string value, string setting)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            errors.Add($"Falta la configuración '{setting}' del proveedor de IA activo.");
        }
    }

    private static void RequireAbsoluteUrl(List<string> errors, string value, string setting)
    {
        if (!string.IsNullOrWhiteSpace(value) &&
            !Uri.TryCreate(value, UriKind.Absolute, out _))
        {
            errors.Add($"{setting} debe ser una URL absoluta.");
        }
    }
}
