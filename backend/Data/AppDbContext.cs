using Microsoft.EntityFrameworkCore;
using OrquestadorApi.Models;

namespace OrquestadorApi.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Project> Projects => Set<Project>();

    public DbSet<ProjectContext> Contexts => Set<ProjectContext>();

    public DbSet<OrchestrationNode> OrchestrationNodes => Set<OrchestrationNode>();

    public DbSet<OrchestrationRelation> OrchestrationRelations => Set<OrchestrationRelation>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Project>()
            .Property(project => project.ProjectNameNormalized)
            .HasComputedColumnSql("lower(btrim(project_name))", stored: true)
            .IsRequired();

        modelBuilder.Entity<Project>()
            .HasIndex(project => project.ProjectNameNormalized)
            .HasDatabaseName(ProjectNameUniqueness.IndexName)
            .IsUnique();

        modelBuilder.Entity<Project>()
            .HasOne(project => project.Context)
            .WithOne(context => context.Project)
            .HasForeignKey<ProjectContext>(context => context.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ProjectContext>()
            .HasMany(context => context.OrchestrationNodes)
            .WithOne(node => node.ProjectContext)
            .HasForeignKey(node => node.ContextId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ProjectContext>()
            .HasMany(context => context.OrchestrationRelations)
            .WithOne(relation => relation.ProjectContext)
            .HasForeignKey(relation => relation.ContextId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<OrchestrationRelation>()
            .HasOne(relation => relation.SourceNode)
            .WithMany()
            .HasForeignKey(relation => relation.SourceNodeId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<OrchestrationRelation>()
            .HasOne(relation => relation.TargetNode)
            .WithMany()
            .HasForeignKey(relation => relation.TargetNodeId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<OrchestrationNode>()
            .HasIndex(node => new { node.ContextId, node.Key })
            .IsUnique();

        modelBuilder.Entity<OrchestrationNode>()
            .HasIndex(node => new { node.ContextId, node.IsActive });

        modelBuilder.Entity<OrchestrationRelation>()
            .HasIndex(relation => new { relation.ContextId });

        modelBuilder.Entity<OrchestrationRelation>()
            .HasIndex(relation => new
            {
                relation.ContextId,
                relation.SourceNodeId,
                relation.TargetNodeId,
                relation.Label
            })
            .IsUnique();
    }
}
