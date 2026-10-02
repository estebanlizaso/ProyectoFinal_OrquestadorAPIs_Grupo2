using System.ComponentModel.DataAnnotations;

namespace OrquestadorApi.DTOs;

public class DeleteProjectRequest
{
    [Range(1, int.MaxValue)]
    public int ProjectId { get; set; }
}
