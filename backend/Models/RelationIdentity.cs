namespace OrquestadorApi.Models;

// Keep the PostgreSQL computed key and the in-memory identity equivalent.
public static class RelationIdentity
{
    public const string IndexName = "ux_relations_context_endpoints_label_operation";
    public const string OperationKeySql = "coalesce(nullif(btrim(case when http_method is not null and path is not null then http_method || ' ' || path else operation end, ' ' || chr(9) || chr(10) || chr(11) || chr(12) || chr(13)), ''), '')";

    public static string OperationKey(string? operation) =>
        operation?.Trim(' ', '\t', '\n', '\v', '\f', '\r') ?? string.Empty;
}
