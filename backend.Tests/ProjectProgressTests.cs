using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using OrquestadorApi.Controllers;
using OrquestadorApi.Data;
using OrquestadorApi.DTOs;
using OrquestadorApi.Models;
using OrquestadorApi.Services.Projects;
using Xunit;

namespace OrquestadorApi.Tests;

public class ProjectProgressTests
{
    [Theory]
    [InlineData("context", true)]
    [InlineData("architecture", true)]
    [InlineData("generation", true)]
    [InlineData(null, false)]
    [InlineData("", false)]
    [InlineData("Architecture", false)]
    [InlineData("architecture\n", false)]
    [InlineData("unknown", false)]
    [InlineData("1", false)]
    public void ValidatesStage(string? stage, bool valid)
    {
        var request = new UpdateProjectProgressRequest { Stage = stage! };
        Assert.Equal(valid, Validator.TryValidateObject(request, new ValidationContext(request), [], true));
    }

    [Fact]
    public async Task NewProjectStartsAtContext()
    {
        await using var fixture = await Fixture.CreateAsync();
        Assert.Equal("context", (await fixture.Service.GetProgressAsync(1))!.Stage);
    }

    [Theory]
    [InlineData("context", "architecture")]
    [InlineData("architecture", "generation")]
    [InlineData("context", "generation")]
    public async Task AdvancesAndPersistsProgress(string first, string next)
    {
        await using var fixture = await Fixture.CreateAsync();
        await fixture.Service.AdvanceProgressAsync(1, first);
        Assert.Equal(next, (await fixture.Service.AdvanceProgressAsync(1, next))!.Stage);
        fixture.Db.ChangeTracker.Clear();
        Assert.Equal(next, (await new ProjectService(fixture.Db).GetProgressAsync(1))!.Stage);
        Assert.Equal("context", (await fixture.Service.GetProgressAsync(2))!.Stage);
    }

    [Theory]
    [InlineData("architecture", "context")]
    [InlineData("architecture", "architecture")]
    [InlineData("generation", "architecture")]
    [InlineData("generation", "context")]
    [InlineData("generation", "generation")]
    public async Task RepeatedOrOlderRequestsDoNotRegressProgress(string reached, string requested)
    {
        await using var fixture = await Fixture.CreateAsync();
        await fixture.Service.AdvanceProgressAsync(1, reached);
        Assert.Equal(reached, (await fixture.Service.AdvanceProgressAsync(1, requested))!.Stage);
        Assert.Equal(reached, (await fixture.Service.GetProgressAsync(1))!.Stage);
    }

    [Fact]
    public async Task ControllerReturnsActualProgressAndNotFoundForMissingProject()
    {
        await using var fixture = await Fixture.CreateAsync();
        var controller = new ProjectsController(fixture.Service);
        var initial = await controller.GetProgress(1, default);
        Assert.Equal("context", Assert.IsType<ProjectProgressResponse>(Assert.IsType<OkObjectResult>(initial.Result).Value).Stage);
        var advanced = await controller.AdvanceProgress(1, new() { Stage = "architecture" }, default);
        Assert.Equal("architecture", Assert.IsType<ProjectProgressResponse>(Assert.IsType<OkObjectResult>(advanced.Result).Value).Stage);
        Assert.IsType<NotFoundResult>((await controller.GetProgress(999, default)).Result);
        Assert.IsType<NotFoundResult>((await controller.AdvanceProgress(999, new() { Stage = "generation" }, default)).Result);
    }

    [Fact]
    public async Task InvalidStageDoesNotChangeProgress()
    {
        await using var fixture = await Fixture.CreateAsync();
        await Assert.ThrowsAsync<ArgumentException>(() => fixture.Service.AdvanceProgressAsync(1, "invalid"));
        Assert.Equal("context", (await fixture.Service.GetProgressAsync(1))!.Stage);
    }

    private sealed class Fixture(SqliteConnection connection, TestDbContext db) : IAsyncDisposable
    {
        public TestDbContext Db => db;
        public ProjectService Service => new(db);

        public static async Task<Fixture> CreateAsync()
        {
            var connection = new SqliteConnection("Data Source=:memory:");
            await connection.OpenAsync();
            var db = new TestDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(connection).Options);
            await db.Database.EnsureCreatedAsync();
            db.Projects.AddRange(new Project { ProjectId = 1, ProjectName = "Test" },
                new Project { ProjectId = 2, ProjectName = "Other" });
            await db.SaveChangesAsync();
            return new Fixture(connection, db);
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
            modelBuilder.Entity<Project>().Property(project => project.ProjectNameNormalized)
                .HasComputedColumnSql("lower(project_name)", stored: true);
            modelBuilder.Entity<OrchestrationRelation>().Property(relation => relation.OperationKey)
                .HasComputedColumnSql("coalesce(operation, '')", stored: true);
        }
    }
}
