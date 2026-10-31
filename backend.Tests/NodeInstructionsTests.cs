using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using OrquestadorApi.Configuration;
using OrquestadorApi.Data;
using OrquestadorApi.DTOs;
using OrquestadorApi.Models;
using OrquestadorApi.Services.AI;
using OrquestadorApi.Services.AI.Contracts;
using OrquestadorApi.Services.Architecture;
using OrquestadorApi.Services.Contexts;
using Xunit;

namespace OrquestadorApi.Tests;

public class NodeInstructionsTests
{
    [Theory]
    [InlineData(null, null, null, true)]
    [InlineData(1, "post", "/polizas/{id}", true)]
    [InlineData(null, "GET", "/polizas", false)]
    [InlineData(1, null, null, false)]
    [InlineData(1, "TRACE", "/polizas", false)]
    [InlineData(1, "GET", "https://example.com/polizas", false)]
    [InlineData(1, "GET", "//example.com/polizas", false)]
    [InlineData(1, "GET", "/poli zas", false)]
    [InlineData(1, "GET", "/polizas?token=secret", false)]
    [InlineData(1, "GET", "/polizas#fragment", false)]
    [InlineData(1, "GET", "/polizas\n", false)]
    public void ValidatesOperationAsACompleteGroup(int? relationId, string? method, string? path, bool valid)
    {
        var request = Request(relationId, method, path);
        Assert.Equal(valid, Validator.TryValidateObject(request, new ValidationContext(request), [], true));
    }

    [Fact]
    public void RequiresNotesAndMapVersionAndLimitsNoteLength()
    {
        var request = new SaveNodeInstructionsRequest { UserNotes = null! };
        Assert.False(Validator.TryValidateObject(request, new ValidationContext(request), [], true));
        request.UserNotes = new string('x', 2001);
        request.ExpectedMapVersion = 0;
        Assert.False(Validator.TryValidateObject(request, new ValidationContext(request), [], true));
    }

    [Fact]
    public async Task SavesNotesAndOperationWithoutCallingAi()
    {
        await using var fixture = await Fixture.CreateAsync();
        var result = await fixture.Service.SaveNodeInstructionsAsync(1, "source", Request(1, " post ", " /polizas/consultar "));

        Assert.Equal(SaveNodeInstructionsStatus.Saved, result.Status);
        Assert.Equal(2, result.Response!.MapVersion);
        Assert.Equal("Registrar errores en un archivo separado.", result.Response.Node.UserNotes);
        Assert.Equal("POST", result.Response.Relation!.HttpMethod);
        Assert.Equal("/polizas/consultar", result.Response.Relation.Path);
        fixture.Db.ChangeTracker.Clear();
        Assert.Equal("POST /polizas/consultar", (await fixture.Db.OrchestrationRelations.FindAsync(1))!.Operation);
        Assert.Equal("Memoria anterior", (await fixture.Db.Contexts.FindAsync(1))!.Resumen);
    }

    [Fact]
    public async Task NotesOnlyCanBeReplacedAndClearedAndNoOpDoesNotIncrementVersion()
    {
        await using var fixture = await Fixture.CreateAsync();
        var request = Request();
        var first = await fixture.Service.SaveNodeInstructionsAsync(1, "source", request);
        request.ExpectedMapVersion = first.Response!.MapVersion;
        var repeated = await fixture.Service.SaveNodeInstructionsAsync(1, "source", request);
        Assert.Equal(2, repeated.Response!.MapVersion);
        Assert.Null(repeated.Response.Relation);
        request.UserNotes = " ";
        var cleared = await fixture.Service.SaveNodeInstructionsAsync(1, "source", request);
        Assert.Null(cleared.Response!.Node.UserNotes);
        Assert.Equal(3, cleared.Response.MapVersion);
        Assert.Equal("GET /polizas", (await fixture.Db.OrchestrationRelations.FindAsync(1))!.Operation);
    }

    [Theory]
    [InlineData(999, "source", 1)]
    [InlineData(1, "missing", 1)]
    [InlineData(1, "unrelated", 1)]
    [InlineData(1, "source", 999)]
    [InlineData(1, "source", 2)]
    public async Task RejectsUnknownOrUnrelatedResourcesWithoutSaving(int projectId, string key, int relationId)
    {
        await using var fixture = await Fixture.CreateAsync();
        var result = await fixture.Service.SaveNodeInstructionsAsync(projectId, key, Request(relationId, "POST", "/new"));
        Assert.Equal(SaveNodeInstructionsStatus.NotFound, result.Status);
        fixture.Db.ChangeTracker.Clear();
        Assert.Null((await fixture.Db.OrchestrationNodes.FindAsync(1))!.UserNotes);
        Assert.Equal(1, (await fixture.Db.Contexts.FindAsync(1))!.MapVersion);
    }

    [Fact]
    public async Task RejectsInactiveEndpoints()
    {
        await using var fixture = await Fixture.CreateAsync();
        (await fixture.Db.OrchestrationNodes.FindAsync(2))!.IsActive = false;
        await fixture.Db.SaveChangesAsync();
        var result = await fixture.Service.SaveNodeInstructionsAsync(1, "source", Request(1, "POST", "/new"));
        Assert.Equal(SaveNodeInstructionsStatus.NotFound, result.Status);
    }

    [Fact]
    public async Task RejectsStaleClientVersionWithoutSaving()
    {
        await using var fixture = await Fixture.CreateAsync();
        var request = Request(1, "POST", "/new");
        request.ExpectedMapVersion = 0;
        var result = await fixture.Service.SaveNodeInstructionsAsync(1, "source", request);
        Assert.Equal(SaveNodeInstructionsStatus.Conflict, result.Status);
        fixture.Db.ChangeTracker.Clear();
        Assert.Equal("GET /polizas", (await fixture.Db.OrchestrationRelations.FindAsync(1))!.Operation);
        Assert.Null((await fixture.Db.OrchestrationNodes.FindAsync(1))!.UserNotes);
    }

    [Fact]
    public async Task ConcurrentVersionChangeRollsBackNoteAndOperation()
    {
        await using var fixture = await Fixture.CreateAsync();
        // Keep an old tracked version, as if another request commits between read and save.
        await fixture.Db.Contexts.LoadAsync();
        await fixture.Db.Database.ExecuteSqlRawAsync("UPDATE contexts SET map_version = 2 WHERE context_id = 1");
        var result = await fixture.Service.SaveNodeInstructionsAsync(1, "source", Request(1, "POST", "/new"));
        Assert.Equal(SaveNodeInstructionsStatus.Conflict, result.Status);
        fixture.Db.ChangeTracker.Clear();
        Assert.Equal(2, (await fixture.Db.Contexts.FindAsync(1))!.MapVersion);
        Assert.Null((await fixture.Db.OrchestrationNodes.FindAsync(1))!.UserNotes);
        Assert.Equal("GET /polizas", (await fixture.Db.OrchestrationRelations.FindAsync(1))!.Operation);
    }

    [Fact]
    public void ExplicitOperationIsTheSourceOfTruth()
    {
        var relation = new OrchestrationRelation
        {
            Label = "consulta", Operation = "GET /old", HttpMethod = "POST", Path = "/new"
        };
        Assert.Equal("POST /new", relation.EffectiveOperation);
    }

    [Fact]
    public async Task GeneratorReceivesCurrentNotesAndStructuredOperation()
    {
        await using var fixture = await Fixture.CreateAsync();
        await fixture.Service.SaveNodeInstructionsAsync(1, "source", Request(1, "POST", "/new"));
        var ai = new RecordingAiProvider();
        var service = new ArchitectureService(fixture.Db, ai, Options.Create(new OrchestrationOptions()),
            NullLogger<ArchitectureService>.Instance);
        var result = await service.GenerateAsync(1, "python");
        Assert.Equal(GenerateArchitectureStatus.Success, result.Status);
        using var input = JsonDocument.Parse(ai.ArchitectureInput!);
        var relation = input.RootElement.GetProperty("relations")[0];
        Assert.Equal("POST /new", relation.GetProperty("operation").GetString());
        Assert.Equal("POST", relation.GetProperty("httpMethod").GetString());
        Assert.Equal("/new", relation.GetProperty("path").GetString());
        var source = input.RootElement.GetProperty("nodes").EnumerateArray()
            .Single(node => node.GetProperty("key").GetString() == "source");
        Assert.Equal("Registrar errores en un archivo separado.", source.GetProperty("userNotes").GetString());
    }

    [Fact]
    public async Task ReplanningPreservesExplicitOperationAndNotes()
    {
        await using var fixture = await Fixture.CreateAsync();
        await fixture.Service.SaveNodeInstructionsAsync(1, "source", Request(1, "POST", "/new"));
        fixture.Db.ChangeTracker.Clear();
        var ai = new RecordingAiProvider();
        var service = new ProjectContextService(fixture.Db, ai, Options.Create(new OrchestrationOptions()),
            NullLogger<ProjectContextService>.Instance);
        var result = await service.CreateAsync(1, "Continuar");
        Assert.Equal(CreateProjectContextStatus.Reused, result.Status);
        Assert.Equal("POST /new", result.Context!.Relations.Single().Operation);
        Assert.Equal("POST", result.Context.Relations.Single().HttpMethod);
        Assert.Equal("Registrar errores en un archivo separado.", result.Context.Nodes.Single(node => node.Key == "source").UserNotes);
        using var input = JsonDocument.Parse(ai.PlannerInput!);
        Assert.Equal("POST /new", input.RootElement.GetProperty("previousRelations")[0].GetProperty("operation").GetString());
    }

    private static SaveNodeInstructionsRequest Request(int? relationId = null, string? method = null, string? path = null) => new()
    {
        UserNotes = " Registrar errores en un archivo separado. ",
        ExpectedMapVersion = 1, RelationId = relationId, HttpMethod = method, Path = path
    };

    private sealed class Fixture(SqliteConnection connection, TestDbContext db) : IAsyncDisposable
    {
        public TestDbContext Db => db;
        public ProjectContextService Service => new(db, new NoAiProvider(),
            Options.Create(new OrchestrationOptions()), NullLogger<ProjectContextService>.Instance);

        public static async Task<Fixture> CreateAsync()
        {
            var connection = new SqliteConnection("Data Source=:memory:");
            await connection.OpenAsync();
            var db = new TestDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(connection).Options);
            await db.Database.EnsureCreatedAsync();
            db.Projects.AddRange(new Project { ProjectId = 1, ProjectName = "Test" },
                new Project { ProjectId = 2, ProjectName = "Other" });
            db.Contexts.AddRange(new ProjectContext { ContextId = 1, ProjectId = 1, InitialPrompt = "Test", MapVersion = 1, Resumen = "Memoria anterior" },
                new ProjectContext { ContextId = 2, ProjectId = 2, InitialPrompt = "Other" });
            db.OrchestrationNodes.AddRange(Node(1, 1, "source"), Node(2, 1, "target"), Node(3, 1, "unrelated"),
                Node(4, 2, "other-source"), Node(5, 2, "other-target"));
            db.OrchestrationRelations.AddRange(
                new OrchestrationRelation { RelationId = 1, ContextId = 1, SourceNodeId = 1, TargetNodeId = 2, Label = "consulta", Operation = "GET /polizas" },
                new OrchestrationRelation { RelationId = 2, ContextId = 2, SourceNodeId = 4, TargetNodeId = 5, Label = "consulta" });
            await db.SaveChangesAsync();
            db.ChangeTracker.Clear();
            return new Fixture(connection, db);
        }

        private static OrchestrationNode Node(int id, int contextId, string key) => new()
        {
            NodeId = id, ContextId = contextId, Key = key, Name = key, Kind = "system", Status = "confirmed"
        };

        public async ValueTask DisposeAsync()
        {
            await db.DisposeAsync();
            await connection.DisposeAsync();
        }
    }

    private sealed class TestDbContext(DbContextOptions<AppDbContext> options) : AppDbContext(options)
    {
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            modelBuilder.Entity<Project>().Property(project => project.ProjectNameNormalized)
                .HasComputedColumnSql("lower(project_name)", stored: true);
        }
    }

    private sealed class RecordingAiProvider : IAiProvider
    {
        public string? ArchitectureInput { get; private set; }
        public string? PlannerInput { get; private set; }

        public Task<PlannerAiResponse> GeneratePlanAsync(string input, CancellationToken cancellationToken = default)
        {
            PlannerInput = input;
            return Task.FromResult(new PlannerAiResponse("ready", "Listo", "Consultar pólizas", [], ["Consultar"], [], "python",
                [new("source", "Source", null, "system", "consumer", null, "confirmed"),
                 new("target", "Target", null, "system", "provider", null, "confirmed")],
                [new("source", "target", "consulta", "GET /old", null, "sync")]));
        }

        public Task<string> GenerateResumenAsync(string initialPrompt, string? previousResumen, string userMessage,
            PlannerAiResponse response, IReadOnlyList<PlannerNodeNote> nodeNotes, CancellationToken cancellationToken = default) =>
            Task.FromResult("Memoria actualizada");

        public Task<ArchitectureAiResponse> GenerateArchitectureAsync(string input, CancellationToken cancellationToken = default)
        {
            ArchitectureInput = input;
            return Task.FromResult(new ArchitectureAiResponse("python", "Generated",
                new[] { "source", "target", "unrelated" }
                    .Select(key => new ArchitectureAiContext(key, "Generated", "pass", [], [], [], [])).ToList()));
        }
    }

    private sealed class NoAiProvider : IAiProvider
    {
        public Task<PlannerAiResponse> GeneratePlanAsync(string input, CancellationToken cancellationToken = default) =>
            throw new InvalidOperationException("Saving instructions must not call AI.");
        public Task<string> GenerateResumenAsync(string initialPrompt, string? previousResumen, string userMessage,
            PlannerAiResponse response, IReadOnlyList<PlannerNodeNote> nodeNotes, CancellationToken cancellationToken = default) =>
            throw new InvalidOperationException("Saving instructions must not call AI.");
        public Task<ArchitectureAiResponse> GenerateArchitectureAsync(string input, CancellationToken cancellationToken = default) =>
            throw new InvalidOperationException("Saving instructions must not call AI.");
    }
}
