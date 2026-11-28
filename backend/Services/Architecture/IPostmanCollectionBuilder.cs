using System.Text.Json;
using OrquestadorApi.DTOs;

namespace OrquestadorApi.Services.Architecture;

public interface IPostmanCollectionBuilder
{
    JsonElement Build(string projectName, ArchitectureResponse architecture);

    string BuildFileName();
}
