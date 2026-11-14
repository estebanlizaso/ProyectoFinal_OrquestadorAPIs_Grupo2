using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using OrquestadorApi.Configuration;
using OrquestadorApi.Controllers;
using OrquestadorApi.Data;
using OrquestadorApi.DTOs;
using OrquestadorApi.Models;
using OrquestadorApi.Services.AI;
using OrquestadorApi.Services.AI.Contracts;
using OrquestadorApi.Services.Contexts;
using Xunit;

namespace OrquestadorApi.Tests;

public class ContextGenerationTests
{
    private static PlannerAiRelation Relation(string? operation) =>
        new("source", "target", "stock", operation, null, "sync");

    private static PlannerAiResponse Plan(params string?[] operations) =>
        new("ready", "Listo", "Stock", [], ["Procesar stock"], [], "python",
            [new("source", "Source", null, "system", "consumer", null, "confirmed"),
             new("target", "Target", null, "system", "provider", null, "confirmed")],
            operations.Select(Relation).ToList());

    [Fact]
    public void DifferentOperationsAreDifferentRelations()
    {
        var result = PlannerResponseNormalizer.Normalize(
            Plan("POST /stock/reservar", "POST /stock/liberar"), new());
        Assert.Equal(2, result.Relations.Count);
    }

    [Theory]
    [InlineData("POST /stock/reservar", "POST /stock/reservar")]
    [InlineData("POST /stock/reservar", " \tPOST /stock/reservar\r\n")]
    [InlineData(null, null)]
    [InlineData(null, "")]
    [InlineData("", " \t\r\n\v\f")]
    public void IdenticalRelationsAreRejected(string? first, string? second) =>
        Assert.Throws<AiProviderException>(() =>
            PlannerResponseNormalizer.Normalize(Plan(first, second), new()));

    [Theory]
    [InlineData("planner")]
    [InlineData("normalizer")]
    [InlineData("summary")]
    [InlineData("empty-summary")]
    public async Task InitialFailureLeavesNothingAndRetryUsesNewGoal(string stage)
    {
        await using var fixture = await Fixture.CreateAsync();
        fixture.Ai.Failure = stage;
        var result = await fixture.Service.CreateAsync(1, "Objetivo fallido");
        Assert.Equal(CreateProjectContextStatus.AiProviderFailed, result.Status);
        Assert.Null(result.ContextId);
        Assert.Equal(0, await fixture.Db.Contexts.CountAsync());
        Assert.Equal(0, await fixture.Db.OrchestrationNodes.CountAsync());
        Assert.Equal(0, await fixture.Db.OrchestrationRelations.CountAsync());
        Assert.Null(await fixture.Service.GetInitialPromptAsync(1));

        fixture.Ai.Failure = null;
        result = await fixture.Service.CreateAsync(1, "Objetivo nuevo");
        Assert.Equal(CreateProjectContextStatus.Created, result.Status);
        Assert.Equal("Objetivo nuevo", result.Context!.InitialPrompt);
        using var input = JsonDocument.Parse(fixture.Ai.Input!);
        Assert.Equal("Objetivo nuevo", input.RootElement.GetProperty("initialPrompt").GetString());
        Assert.Equal(JsonValueKind.Null, input.RootElement.GetProperty("resumen").ValueKind);
        Assert.Empty(input.RootElement.GetProperty("previousNodes").EnumerateArray());
    }

    [Theory]
    [InlineData("planner")]
    [InlineData("normalizer")]
    [InlineData("summary")]
    [InlineData("empty-summary")]
    public async Task ExistingContextIsUnchangedAfterAiFailure(string stage)
    {
        await using var fixture = await Fixture.CreateAsync();
        var first = await fixture.Service.CreateAsync(1, "Original");
        fixture.Db.ChangeTracker.Clear();
        var before = JsonSerializer.Serialize(await fixture.Service.GetAsync(1));
        fixture.Ai.Failure = stage;
        var failed = await fixture.Service.CreateAsync(1, "Cambiar todo");
        Assert.Equal(CreateProjectContextStatus.AiProviderFailed, failed.Status);
        Assert.Equal(first.Context!.ContextId, failed.ContextId);
        Assert.Equal(before, JsonSerializer.Serialize(await fixture.Service.GetAsync(1)));
    }

    [Fact]
    public async Task ParallelOperationsPersistAndKeepIdsAndManualInstructions()
    {
        await using var fixture = await Fixture.CreateAsync();
        var first = await fixture.Service.CreateAsync(1, "Stock");
        var relation = first.Context!.Relations[0];
        await fixture.Service.SaveNodeInstructionsAsync(1, "source", new()
        {
            ExpectedMapVersion = first.Context.MapVersion, UserNotes = "Conservar nota",
            RelationId = relation.Id, HttpMethod = "POST", Path = "/stock/manual"
        });
        fixture.Db.ChangeTracker.Clear();
        fixture.Ai.Response = Plan("POST /stock/manual", "POST /stock/liberar");
        var next = await fixture.Service.CreateAsync(1, "Continuar");
        Assert.Equal(CreateProjectContextStatus.Reused, next.Status);
        Assert.Equal(2, next.Context!.Relations.Count);
        var manual = next.Context.Relations.Single(r => r.Operation == "POST /stock/manual");
        Assert.Equal(relation.Id, manual.Id);
        Assert.Equal("POST", manual.HttpMethod);
        Assert.Equal("Conservar nota", next.Context.Nodes.Single(n => n.Key == "source").UserNotes);
        fixture.Db.ChangeTracker.Clear();
        fixture.Ai.Response = Plan("POST /stock/liberar");
        var removed = await fixture.Service.CreateAsync(1, "Solo liberar");
        Assert.Single(removed.Context!.Relations);
        Assert.Equal("POST /stock/liberar", removed.Context.Relations[0].Operation);
    }

    [Theory]
    [InlineData(false, 1)]
    [InlineData(false, 2)]
    [InlineData(false, 3)]
    [InlineData(false, 4)]
    [InlineData(true, 2)]
    [InlineData(true, 1)]
    [InlineData(true, 3)]
    public async Task PersistenceFailureRollsBackEverySave(bool existing, int failAt)
    {
        await using var fixture = await Fixture.CreateAsync();
        if (existing)
        {
            await fixture.Service.CreateAsync(1, "Original");
            fixture.Db.ChangeTracker.Clear();
        }
        var before = JsonSerializer.Serialize(await fixture.Service.GetAsync(1));
        fixture.Interceptor.FailAt = failAt;
        fixture.Interceptor.Saves = 0;
        fixture.Ai.Response = Plan("DELETE /stock");
        await Assert.ThrowsAsync<InvalidOperationException>(() => fixture.Service.CreateAsync(1, "Nuevo"));
        Assert.Empty(fixture.Db.ChangeTracker.Entries());
        Assert.Equal(before, JsonSerializer.Serialize(await fixture.Service.GetAsync(1)));
        fixture.Interceptor.FailAt = null;
        await fixture.Db.SaveChangesAsync();
        Assert.Equal(before, JsonSerializer.Serialize(await fixture.Service.GetAsync(1)));
        if (!existing)
        {
            Assert.Empty(await fixture.Db.OrchestrationNodes.ToListAsync());
            Assert.Empty(await fixture.Db.OrchestrationRelations.ToListAsync());
        }
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task DatabaseFailureAfterSavingNodesRollsBackWholeAttempt(bool existing)
    {
        await using var fixture = await Fixture.CreateAsync();
        if (existing)
        {
            await fixture.Service.CreateAsync(1, "Original");
            fixture.Db.ChangeTracker.Clear();
        }
        var before = JsonSerializer.Serialize(await fixture.Service.GetAsync(1));
        await fixture.Db.Database.ExecuteSqlRawAsync("""
            CREATE TRIGGER fail_relation BEFORE INSERT ON orchestration_relations
            BEGIN SELECT RAISE(ABORT, 'Simulated database constraint failure'); END;
            """);
        fixture.Ai.Response = Plan("DELETE /stock");
        await Assert.ThrowsAsync<DbUpdateException>(() => fixture.Service.CreateAsync(1, "Nuevo"));
        Assert.Empty(fixture.Db.ChangeTracker.Entries());
        Assert.Equal(before, JsonSerializer.Serialize(await fixture.Service.GetAsync(1)));
        if (!existing)
        {
            Assert.Empty(await fixture.Db.OrchestrationNodes.ToListAsync());
            Assert.Empty(await fixture.Db.OrchestrationRelations.ToListAsync());
        }
    }

    [Fact]
    public async Task InitialErrorControllerReturnsNullContextId()
    {
        await using var fixture = await Fixture.CreateAsync();
        fixture.Ai.Failure = "planner";
        var controller = new ProjectContextsController(fixture.Service);
        var result = await controller.Create(1, new() { Prompt = "Objetivo" }, default);
        var response = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(502, response.StatusCode);
        Assert.Null(Assert.IsType<ProjectContextGenerationErrorResponse>(response.Value).ContextId);
    }

    [Fact]
    public async Task ConcurrentChangeIsPreservedAndGenerationReturnsConflict()
    {
        await using var fixture = await Fixture.CreateAsync();
        await fixture.Service.CreateAsync(1, "Original");
        fixture.Db.ChangeTracker.Clear();
        fixture.Ai.BeforeSummary = async () =>
        {
            await fixture.Db.Contexts.ExecuteUpdateAsync(update =>
                update.SetProperty(c => c.MapVersion, c => c.MapVersion + 1)
                    .SetProperty(c => c.Resumen, "Cambio concurrente"));
        };
        fixture.Ai.Response = Plan("DELETE /stock");
        var result = await fixture.Service.CreateAsync(1, "Cambiar");
        Assert.Equal(CreateProjectContextStatus.Conflict, result.Status);
        var persisted = await fixture.Service.GetAsync(1);
        Assert.Equal("Cambio concurrente", persisted!.Resumen);
        Assert.Equal(2, persisted.MapVersion);
        Assert.Equal(2, persisted.Relations.Count);
        Assert.DoesNotContain(persisted.Relations, r => r.Operation == "DELETE /stock");
    }

    [Fact]
    public async Task ManualEditCannotDuplicateAnotherOperationOrSaveNotesOnConflict()
    {
        await using var fixture = await Fixture.CreateAsync();
        var initial = await fixture.Service.CreateAsync(1, "Stock");
        fixture.Db.ChangeTracker.Clear();
        var before = JsonSerializer.Serialize(await fixture.Service.GetAsync(1));
        var result = await fixture.Service.SaveNodeInstructionsAsync(1, "source", new()
        {
            ExpectedMapVersion = initial.Context!.MapVersion, UserNotes = "No guardar",
            RelationId = initial.Context.Relations[0].Id, HttpMethod = "POST", Path = "/stock/liberar"
        });
        Assert.Equal(SaveNodeInstructionsStatus.Conflict, result.Status);
        Assert.Equal(before, JsonSerializer.Serialize(await fixture.Service.GetAsync(1)));
    }

    [Fact]
    public async Task NoInitialContextExistsWhileAiIsRunning()
    {
        await using var fixture = await Fixture.CreateAsync();
        fixture.Ai.BeforeSummary = async () =>
        {
            Assert.False(await fixture.Db.Contexts.AnyAsync());
            Assert.Empty(fixture.Db.ChangeTracker.Entries<ProjectContext>());
        };
        Assert.Equal(CreateProjectContextStatus.Created,
            (await fixture.Service.CreateAsync(1, "Nuevo")).Status);
    }

    [Fact]
    public void PostgreSqlMigrationUsesNonNullComputedIdentityWithoutChangingExistingRows()
    {
        // Generate SQL only: no connection is opened and Program/seed never runs.
        using var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql("Host=unused.invalid;Database=unused;Username=unused").Options);
        var migration = db.Database.GetMigrations().Single(m => m.EndsWith("_IncludeOperationInRelationIdentity"));
        var sql = db.GetService<IMigrator>().GenerateScript("20261031212717_AddRelationHttpInstructions", migration);
        Assert.Contains("GENERATED ALWAYS AS", sql);
        Assert.Contains(RelationIdentity.OperationKeySql, sql);
        Assert.Contains("STORED NOT NULL", sql);
        Assert.Contains($"CREATE UNIQUE INDEX {RelationIdentity.IndexName}", sql);
        Assert.Contains("(context_id, source_node_id, target_node_id, label, operation_key)", sql);
        Assert.DoesNotContain("UPDATE orchestration_relations", sql);
        Assert.DoesNotContain("DELETE FROM", sql);
    }

    [Fact]
    public async Task ClarificationWithoutNodesKeepsMapAndManualNotes()
    {
        await using var fixture = await Fixture.CreateAsync();
        var first = await fixture.Service.CreateAsync(1, "Stock");
        fixture.Db.ChangeTracker.Clear();
        fixture.Ai.Response = new("needs_clarification", "Aclarar", "Stock", ["¿Qué dato?"], [], [], null, [], []);
        var result = await fixture.Service.CreateAsync(1, "Aclarar");
        Assert.Equal(first.Context!.Relations.Select(r => r.Id), result.Context!.Relations.Select(r => r.Id));
        Assert.Equal(2, result.Context.Nodes.Count);
        Assert.Equal(first.Context.MapVersion + 1, result.Context.MapVersion);
    }

    [Fact]
    public async Task ValidOutOfScopeKeepsHttpCreationContractAndDoesNotModifyExistingContext()
    {
        await using var fixture = await Fixture.CreateAsync();
        fixture.Ai.Response = new("out_of_scope", "Fuera de alcance", "Fuera de alcance", [], [], [], null, [], []);
        var first = await fixture.Service.CreateAsync(1, "Fuera de alcance");
        Assert.Equal(CreateProjectContextStatus.Created, first.Status);
        Assert.True(first.Context!.ContextId > 0);
        fixture.Db.ChangeTracker.Clear();
        var before = JsonSerializer.Serialize(await fixture.Service.GetAsync(1));
        var next = await fixture.Service.CreateAsync(1, "Otro pedido fuera de alcance");
        Assert.Equal(CreateProjectContextStatus.Reused, next.Status);
        Assert.Equal(before, JsonSerializer.Serialize(await fixture.Service.GetAsync(1)));
    }

    [Fact]
    public async Task CancellationDoesNotLeaveInitialContext()
    {
        await using var fixture = await Fixture.CreateAsync();
        fixture.Ai.BeforeSummary = () => throw new OperationCanceledException();
        await Assert.ThrowsAsync<OperationCanceledException>(() => fixture.Service.CreateAsync(1, "Cancelar"));
        Assert.False(await fixture.Db.Contexts.AnyAsync());
    }

    [Theory]
    [InlineData(null, "")]
    [InlineData("", " \t\r\n\v\f")]
    [InlineData("POST /stock", " POST /stock ")]
    public async Task DatabaseRejectsEquivalentOperationKeys(string? first, string? second)
    {
        await using var fixture = await Fixture.CreateAsync();
        fixture.Ai.Response = Plan(first);
        await fixture.Service.CreateAsync(1, "Stock");
        fixture.Db.ChangeTracker.Clear();
        var original = await fixture.Db.OrchestrationRelations.AsNoTracking().SingleAsync();
        fixture.Db.OrchestrationRelations.Add(new()
        {
            ContextId = original.ContextId, SourceNodeId = original.SourceNodeId,
            TargetNodeId = original.TargetNodeId, Label = original.Label, Operation = second
        });
        await Assert.ThrowsAsync<DbUpdateException>(() => fixture.Db.SaveChangesAsync());
    }

    private sealed class FailureInterceptor : SaveChangesInterceptor
    {
        public int Saves { get; set; }
        public int? FailAt { get; set; }
        public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
            DbContextEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
        {
            if (++Saves == FailAt) throw new InvalidOperationException("Simulated persistence failure");
            return ValueTask.FromResult(result);
        }
    }

    private sealed class Fixture(SqliteConnection connection, TestDbContext db,
        FakeAi ai, FailureInterceptor interceptor) : IAsyncDisposable
    {
        public TestDbContext Db => db;
        public FakeAi Ai => ai;
        public FailureInterceptor Interceptor => interceptor;
        public ProjectContextService Service => new(db, ai, Options.Create(new OrchestrationOptions()),
            NullLogger<ProjectContextService>.Instance);

        public static async Task<Fixture> CreateAsync()
        {
            var connection = new SqliteConnection("Data Source=:memory:");
            await connection.OpenAsync();
            var interceptor = new FailureInterceptor();
            var db = new TestDbContext(new DbContextOptionsBuilder<AppDbContext>()
                .UseSqlite(connection).AddInterceptors(interceptor).Options);
            await db.Database.EnsureCreatedAsync();
            db.Projects.Add(new() { ProjectId = 1, ProjectName = "Test" });
            await db.SaveChangesAsync();
            return new(connection, db, new(), interceptor);
        }

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
            modelBuilder.Entity<Project>().Property(p => p.ProjectNameNormalized)
                .HasComputedColumnSql("lower(project_name)", stored: true);
            modelBuilder.Entity<OrchestrationRelation>().Property(r => r.OperationKey)
                .HasComputedColumnSql("trim(coalesce(case when http_method is not null and path is not null then http_method || ' ' || path else operation end, ''), char(32, 9, 10, 11, 12, 13))", stored: true);
        }
    }

    private sealed class FakeAi : IAiProvider
    {
        public string? Failure { get; set; }
        public string? Input { get; private set; }
        public Func<Task>? BeforeSummary { get; set; }
        public PlannerAiResponse Response { get; set; } = Plan("POST /stock/reservar", "POST /stock/liberar");
        public Task<PlannerAiResponse> GeneratePlanAsync(string input, CancellationToken cancellationToken = default)
        {
            Input = input;
            if (Failure == "planner") throw new AiProviderException("Planner failed");
            return Task.FromResult(Failure == "normalizer" ? Plan(null, "") : Response);
        }

        public async Task<string> GenerateResumenAsync(string initialPrompt, string? previousResumen, string userMessage,
            PlannerAiResponse response, IReadOnlyList<PlannerNodeNote> nodeNotes, CancellationToken cancellationToken = default)
        {
            if (BeforeSummary is not null) await BeforeSummary();
            if (Failure == "summary") throw new AiProviderException("Summary failed");
            return Failure == "empty-summary" ? " " : "Memoria";
        }

        public Task<ArchitectureAiResponse> GenerateArchitectureAsync(string input, CancellationToken cancellationToken = default) =>
            throw new InvalidOperationException("Architecture is outside this test");
    }
}
