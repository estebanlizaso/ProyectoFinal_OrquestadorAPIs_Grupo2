using System.Data.Common;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Npgsql;
using OrquestadorApi.Configuration;
using OrquestadorApi.Data;
using OrquestadorApi.Models;
using OrquestadorApi.Services.AI;
using OrquestadorApi.Services.AI.Contracts;
using OrquestadorApi.Services.Contexts;
using Xunit;

namespace OrquestadorApi.Tests;

// Explicit opt-in. Never uses .env, Program.cs, the design-time factory or seed.
public sealed class PostgresFactAttribute : FactAttribute
{
    public PostgresFactAttribute()
    {
        if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable(PostgresFixture.DatabaseVariable)))
            Skip = "Requires an explicitly provisioned disposable PostgreSQL database.";
    }
}

public sealed class PostgresTheoryAttribute : TheoryAttribute
{
    public PostgresTheoryAttribute()
    {
        if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable(PostgresFixture.DatabaseVariable)))
            Skip = "Requires an explicitly provisioned disposable PostgreSQL database.";
    }
}

public sealed class PostgresContextIntegrationTests(PostgresFixture fixture) : IClassFixture<PostgresFixture>
{
    private static PlannerAiResponse Plan(params string?[] operations) => new(
        "ready", "Listo", "Stock", [], ["Procesar stock"], [], "python",
        [new("source", "Source", null, "system", "consumer", null, "confirmed"),
         new("target", "Target", null, "system", "provider", null, "confirmed")],
        operations.Select(op => new PlannerAiRelation("source", "target", "stock", op, null, "sync")).ToList());

    private static ProjectContextService Service(AppDbContext db, IAiProvider? ai = null) => new(
        db, ai ?? new TestAi(), Options.Create(new OrchestrationOptions()),
        NullLogger<ProjectContextService>.Instance);

    [PostgresFact]
    public async Task AllMigrationsAreAppliedIncludingComputedOperationIndex()
    {
        await using var db = fixture.CreateContext();
        Assert.Empty(await db.Database.GetPendingMigrationsAsync());
        Assert.Contains(await db.Database.GetAppliedMigrationsAsync(),
            m => m.EndsWith("_IncludeOperationInRelationIdentity"));
        await using var connection = await fixture.OpenVerifiedConnectionAsync();
        await using var command = new NpgsqlCommand("""
            SELECT is_nullable, is_generated FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'orchestration_relations'
                AND column_name = 'operation_key';
            """, connection);
        await using var reader = await command.ExecuteReaderAsync();
        Assert.True(await reader.ReadAsync());
        Assert.Equal("NO", reader.GetString(0));
        Assert.Equal("ALWAYS", reader.GetString(1));
    }

    [PostgresFact]
    public async Task DifferentOperationsPersistAndReconcileWithStableIds()
    {
        var projectId = await fixture.NewProjectAsync();
        await using var db = fixture.CreateContext();
        var created = await Service(db).CreateAsync(projectId, "Stock");
        Assert.Equal(CreateProjectContextStatus.Created, created.Status);
        Assert.Equal(2, created.Context!.Relations.Count);
        await using var second = fixture.CreateContext();
        var updated = await Service(second).CreateAsync(projectId, "Continuar");
        Assert.Equal(CreateProjectContextStatus.Reused, updated.Status);
        Assert.Equal(created.Context.Relations.Select(r => r.Id), updated.Context!.Relations.Select(r => r.Id));
        Assert.Equal(new[] { "POST /stock/reservar", "POST /stock/liberar" },
            updated.Context.Relations.Select(r => r.Operation));
    }

    [PostgresTheory]
    [InlineData("POST /stock/reservar", "POST /stock/reservar")]
    [InlineData("POST /stock/reservar", " \tPOST /stock/reservar\r\n")]
    [InlineData(null, null)]
    [InlineData(null, "")]
    [InlineData("", " \t\r\n\v\f")]
    public async Task PostgreSqlRejectsIdenticalRelationsIncludingNullAndBlank(string? first, string? duplicate)
    {
        var projectId = await fixture.NewProjectAsync();
        await using var seed = fixture.CreateContext();
        var created = await Service(seed, new TestAi(Plan(first))).CreateAsync(projectId, "Stock");
        var relation = created.Context!.Relations.Single();
        var original = await seed.OrchestrationRelations.AsNoTracking().SingleAsync(r => r.RelationId == relation.Id);
        await using var db = fixture.CreateContext();
        db.OrchestrationRelations.Add(new()
        {
            ContextId = original.ContextId, SourceNodeId = original.SourceNodeId,
            TargetNodeId = original.TargetNodeId, Label = original.Label, Operation = duplicate
        });
        var exception = await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync());
        var postgres = Assert.IsType<PostgresException>(exception.InnerException);
        Assert.Equal(PostgresErrorCodes.UniqueViolation, postgres.SqlState);
        Assert.Equal(RelationIdentity.IndexName, postgres.ConstraintName);
        await using var verify = fixture.CreateContext();
        Assert.Equal(1, await verify.OrchestrationRelations.CountAsync(r => r.ContextId == original.ContextId));
    }

    [PostgresFact]
    public async Task ManualEffectiveOperationParticipatesInDatabaseIdentityAndSurvivesReplanning()
    {
        var projectId = await fixture.NewProjectAsync();
        await using var db = fixture.CreateContext();
        var created = await Service(db).CreateAsync(projectId, "Stock");
        var relation = created.Context!.Relations.First();
        var edit = await Service(db).SaveNodeInstructionsAsync(projectId, "source", new()
        {
            ExpectedMapVersion = created.Context.MapVersion, UserNotes = "Conservar instrucciones",
            RelationId = relation.Id, HttpMethod = "POST", Path = "/stock/manual"
        });
        Assert.Equal(SaveNodeInstructionsStatus.Saved, edit.Status);
        await using var next = fixture.CreateContext();
        var replanned = await Service(next, new TestAi(Plan("POST /stock/manual", "POST /stock/liberar")))
            .CreateAsync(projectId, "Continuar");
        Assert.Equal(CreateProjectContextStatus.Reused, replanned.Status);
        Assert.Equal(relation.Id, replanned.Context!.Relations.Single(r => r.Operation == "POST /stock/manual").Id);
        Assert.Equal("Conservar instrucciones", replanned.Context.Nodes.Single(n => n.Key == "source").UserNotes);
        var stored = await next.OrchestrationRelations.AsNoTracking().SingleAsync(r => r.RelationId == relation.Id);
        Assert.Equal("POST /stock/manual", stored.OperationKey);
        await using var duplicateDb = fixture.CreateContext();
        duplicateDb.OrchestrationRelations.Add(new()
        {
            ContextId = stored.ContextId, SourceNodeId = stored.SourceNodeId,
            TargetNodeId = stored.TargetNodeId, Label = stored.Label,
            Operation = "ignored stale text", HttpMethod = "POST", Path = "/stock/manual"
        });
        var exception = await Assert.ThrowsAsync<DbUpdateException>(() => duplicateDb.SaveChangesAsync());
        Assert.Equal(RelationIdentity.IndexName, Assert.IsType<PostgresException>(exception.InnerException).ConstraintName);
    }

    [PostgresTheory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task IndependentConnectionsResolveConcurrentGenerationWithoutPartialWrites(bool existing)
    {
        var projectId = await fixture.NewProjectAsync();
        if (existing)
        {
            await using var seed = fixture.CreateContext();
            await Service(seed).CreateAsync(projectId, "Original");
        }
        // Both services must read the same initial state before either persists.
        var barrier = new AsyncBarrier();
        await using var first = fixture.CreateContext();
        await using var second = fixture.CreateContext();
        await first.Database.OpenConnectionAsync();
        await second.Database.OpenConnectionAsync();
        Assert.NotEqual(((NpgsqlConnection)first.Database.GetDbConnection()).ProcessID,
            ((NpgsqlConnection)second.Database.GetDbConnection()).ProcessID);
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(30));
        var results = await Task.WhenAll(
            Service(first, new TestAi(beforeSummary: barrier.WaitAsync)).CreateAsync(projectId, "Objetivo A", timeout.Token),
            Service(second, new TestAi(beforeSummary: barrier.WaitAsync)).CreateAsync(projectId, "Objetivo B", timeout.Token));
        Assert.Single(results, r => r.Status == (existing ? CreateProjectContextStatus.Reused : CreateProjectContextStatus.Created));
        Assert.Single(results, r => r.Status == CreateProjectContextStatus.Conflict);
        await using var verify = fixture.CreateContext();
        var persisted = await Service(verify).GetAsync(projectId);
        Assert.NotNull(persisted);
        Assert.Equal(existing ? 2 : 1, persisted.MapVersion);
        Assert.Equal(2, persisted.Nodes.Count);
        Assert.Equal(2, persisted.Relations.Count);
        Assert.Equal(1, await verify.Contexts.CountAsync(c => c.ProjectId == projectId));
        var winner = results.Single(r => r.Context is not null).Context!;
        Assert.Equal(winner.InitialPrompt, persisted.InitialPrompt);
    }

    [PostgresFact]
    public async Task ConcurrentManualInstructionsWinOverStaleGeneration()
    {
        var projectId = await fixture.NewProjectAsync();
        await using var seed = fixture.CreateContext();
        var created = await Service(seed).CreateAsync(projectId, "Original");
        var started = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var resume = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        await using var generation = fixture.CreateContext();
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(30));
        var pending = Service(generation, new TestAi(beforeSummary: async token =>
        {
            started.SetResult();
            await resume.Task.WaitAsync(token);
        })).CreateAsync(projectId, "Continuar", timeout.Token);
        await started.Task.WaitAsync(timeout.Token);
        await using var manual = fixture.CreateContext();
        var saved = await Service(manual).SaveNodeInstructionsAsync(projectId, "source", new()
        {
            ExpectedMapVersion = created.Context!.MapVersion, UserNotes = "Edición concurrente"
        });
        Assert.Equal(SaveNodeInstructionsStatus.Saved, saved.Status);
        resume.SetResult();
        Assert.Equal(CreateProjectContextStatus.Conflict, (await pending).Status);
        await using var verify = fixture.CreateContext();
        var persisted = await Service(verify).GetAsync(projectId);
        Assert.Equal(2, persisted!.MapVersion);
        Assert.Equal("Edición concurrente", persisted.Nodes.Single(n => n.Key == "source").UserNotes);
        Assert.Equal(2, persisted.Relations.Count);
    }

    [PostgresFact]
    public async Task PostgreSqlUniqueIndexArbitratesConcurrentDuplicateInserts()
    {
        var projectId = await fixture.NewProjectAsync();
        await using var seed = fixture.CreateContext();
        var created = await Service(seed).CreateAsync(projectId, "Stock");
        var original = await seed.OrchestrationRelations.AsNoTracking().FirstAsync(r => r.ContextId == created.Context!.ContextId);
        await using var first = fixture.CreateContext();
        await using var second = fixture.CreateContext();
        foreach (var db in new[] { first, second })
            db.OrchestrationRelations.Add(new()
            {
                ContextId = original.ContextId, SourceNodeId = original.SourceNodeId,
                TargetNodeId = original.TargetNodeId, Label = original.Label, Operation = "POST /stock/concurrent"
            });
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(30));
        static async Task<bool> InsertAsync(AppDbContext db, CancellationToken token)
        {
            try { await db.SaveChangesAsync(token); return true; }
            catch (DbUpdateException e) when (e.InnerException is PostgresException
                { SqlState: PostgresErrorCodes.UniqueViolation, ConstraintName: RelationIdentity.IndexName })
            { return false; }
        }
        var results = await Task.WhenAll(InsertAsync(first, timeout.Token), InsertAsync(second, timeout.Token));
        Assert.Single(results, success => success);
        Assert.Single(results, success => !success);
        await using var verify = fixture.CreateContext();
        Assert.Equal(1, await verify.OrchestrationRelations.CountAsync(r =>
            r.ContextId == original.ContextId && r.Operation == "POST /stock/concurrent"));
    }

    [PostgresTheory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task RealDatabaseFailureRollsBackContextNodesRelationsAndMetadata(bool existing)
    {
        var projectId = await fixture.NewProjectAsync();
        if (existing)
        {
            await using var seed = fixture.CreateContext();
            await Service(seed).CreateAsync(projectId, "Original");
        }
        await using var snapshot = fixture.CreateContext();
        var before = JsonSerializer.Serialize(await Service(snapshot).GetAsync(projectId));
        // The interceptor adds a duplicate only when relations are about to be saved,
        // after the context and nodes have already been written in the transaction.
        await using var db = fixture.CreateContext(new DuplicateRelationInterceptor());
        var failed = await Service(db, new TestAi(Plan("POST /stock/reservar", "POST /stock/liberar", "POST /stock/new")))
            .CreateAsync(projectId, "Intento fallido");
        Assert.Equal(CreateProjectContextStatus.Conflict, failed.Status);
        Assert.Empty(db.ChangeTracker.Entries());
        await using var verify = fixture.CreateContext();
        Assert.Equal(before, JsonSerializer.Serialize(await Service(verify).GetAsync(projectId)));
        if (!existing)
        {
            Assert.False(await verify.Contexts.AnyAsync(c => c.ProjectId == projectId));
            Assert.False(await verify.OrchestrationNodes.AnyAsync(n => n.ProjectContext.ProjectId == projectId));
            Assert.False(await verify.OrchestrationRelations.AnyAsync(r => r.ProjectContext.ProjectId == projectId));
            await using var retry = fixture.CreateContext();
            var result = await Service(retry).CreateAsync(projectId, "Nuevo objetivo");
            Assert.Equal(CreateProjectContextStatus.Created, result.Status);
            Assert.Equal("Nuevo objetivo", result.Context!.InitialPrompt);
        }
    }

    private sealed class DuplicateRelationInterceptor : SaveChangesInterceptor
    {
        public override ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData eventData,
            InterceptionResult<int> result, CancellationToken cancellationToken = default)
        {
            var db = eventData.Context!;
            var relation = db.ChangeTracker.Entries<OrchestrationRelation>()
                .FirstOrDefault(e => e.State == EntityState.Added)?.Entity;
            if (relation is not null)
                db.Add(new OrchestrationRelation
                {
                    ContextId = relation.ContextId, SourceNodeId = relation.SourceNodeId,
                    TargetNodeId = relation.TargetNodeId, Label = relation.Label, Operation = relation.Operation
                });
            return ValueTask.FromResult(result);
        }
    }

    private sealed class AsyncBarrier
    {
        private int arrivals;
        private readonly TaskCompletionSource ready = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public async Task WaitAsync(CancellationToken token)
        {
            if (Interlocked.Increment(ref arrivals) == 2) ready.SetResult();
            await ready.Task.WaitAsync(token);
        }
    }

    private sealed class TestAi(PlannerAiResponse? plan = null, Func<CancellationToken, Task>? beforeSummary = null) : IAiProvider
    {
        public Task<PlannerAiResponse> GeneratePlanAsync(string input, CancellationToken cancellationToken = default) =>
            Task.FromResult(plan ?? Plan("POST /stock/reservar", "POST /stock/liberar"));
        public async Task<string> GenerateResumenAsync(string initialPrompt, string? previousResumen, string userMessage,
            PlannerAiResponse response, IReadOnlyList<PlannerNodeNote> nodeNotes, CancellationToken cancellationToken = default)
        {
            if (beforeSummary is not null) await beforeSummary(cancellationToken);
            return "Memoria " + userMessage;
        }
        public Task<ArchitectureAiResponse> GenerateArchitectureAsync(string input, CancellationToken cancellationToken = default) =>
            throw new InvalidOperationException("Architecture is outside these tests.");
    }
}

public sealed class PostgresFixture : IAsyncLifetime
{
    public const string DatabaseVariable = "ORQUESTADOR_PG_TEST_DATABASE";
    private string DatabaseName => Environment.GetEnvironmentVariable(DatabaseVariable)
        ?? throw new InvalidOperationException("An explicit disposable database is required.");

    private string ConnectionString
    {
        get
        {
            if (!Regex.IsMatch(DatabaseName, "^orquestador_context_it_[0-9]{14}_[a-f0-9]{8}$"))
                throw new InvalidOperationException("Refusing a database outside the disposable test naming policy.");
            return new NpgsqlConnectionStringBuilder
            {
                Host = "localhost", Port = 5432, Username = "postgres", Database = DatabaseName,
                Pooling = false, Timeout = 5, CommandTimeout = 20, IncludeErrorDetail = false
            }.ConnectionString;
        }
    }

    public AppDbContext CreateContext(params IInterceptor[] interceptors) => new(
        new DbContextOptionsBuilder<AppDbContext>().UseNpgsql(ConnectionString)
            .AddInterceptors(new DatabaseGuard(DatabaseName)).AddInterceptors(interceptors).Options);

    public async Task<NpgsqlConnection> OpenVerifiedConnectionAsync()
    {
        var connection = new NpgsqlConnection(ConnectionString);
        try
        {
            await connection.OpenAsync();
            await DatabaseGuard.VerifyAsync(connection, null, DatabaseName, default);
            return connection;
        }
        catch { await connection.DisposeAsync(); throw; }
    }

    public async Task InitializeAsync()
    {
        if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable(DatabaseVariable))) return;
        await using var connection = await OpenVerifiedConnectionAsync();
        await using var db = CreateContext();
        await db.Database.MigrateAsync();
    }

    public async Task<int> NewProjectAsync()
    {
        await using var db = CreateContext();
        var project = new Project { ProjectName = "PG integration " + Guid.NewGuid().ToString("N") };
        db.Projects.Add(project);
        await db.SaveChangesAsync();
        return project.ProjectId;
    }

    // Intentionally retain all data and the database. Cleanup needs user approval.
    public Task DisposeAsync() => Task.CompletedTask;

    private sealed class DatabaseGuard(string expected) : DbCommandInterceptor
    {
        public static async Task VerifyAsync(DbConnection connection, DbTransaction? transaction,
            string expected, CancellationToken token)
        {
            if (connection.Database != expected || expected == "orquestador")
                throw new InvalidOperationException("Refusing an unexpected PostgreSQL target.");
            await using var check = connection.CreateCommand();
            check.Transaction = transaction;
            check.CommandText = "SELECT current_database()";
            if (!string.Equals(await check.ExecuteScalarAsync(token) as string, expected, StringComparison.Ordinal))
                throw new InvalidOperationException("PostgreSQL database verification failed.");
        }

        private async Task VerifyCommandAsync(DbCommand command, CancellationToken token)
        {
            // Retain test data: even an accidental cleanup or reconciliation delete
            // must fail before reaching PostgreSQL. DROP INDEX in Up is allowed.
            if (Regex.IsMatch(command.CommandText,
                    @"\b(DELETE\s+FROM|TRUNCATE|DROP\s+(TABLE|DATABASE))\b", RegexOptions.IgnoreCase))
                throw new InvalidOperationException("Deleting PostgreSQL test data requires explicit user approval.");
            await VerifyAsync(command.Connection!, command.Transaction, expected, token);
        }

        private void Verify(DbCommand command) => VerifyCommandAsync(command, default)
            .GetAwaiter().GetResult();
        public override InterceptionResult<DbDataReader> ReaderExecuting(DbCommand command, CommandEventData eventData,
            InterceptionResult<DbDataReader> result) { Verify(command); return result; }
        public override InterceptionResult<int> NonQueryExecuting(DbCommand command, CommandEventData eventData,
            InterceptionResult<int> result) { Verify(command); return result; }
        public override InterceptionResult<object> ScalarExecuting(DbCommand command, CommandEventData eventData,
            InterceptionResult<object> result) { Verify(command); return result; }
        public override async ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(DbCommand command,
            CommandEventData eventData, InterceptionResult<DbDataReader> result, CancellationToken cancellationToken = default)
        { await VerifyCommandAsync(command, cancellationToken); return result; }
        public override async ValueTask<InterceptionResult<int>> NonQueryExecutingAsync(DbCommand command,
            CommandEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
        { await VerifyCommandAsync(command, cancellationToken); return result; }
        public override async ValueTask<InterceptionResult<object>> ScalarExecutingAsync(DbCommand command,
            CommandEventData eventData, InterceptionResult<object> result, CancellationToken cancellationToken = default)
        { await VerifyCommandAsync(command, cancellationToken); return result; }
    }
}
