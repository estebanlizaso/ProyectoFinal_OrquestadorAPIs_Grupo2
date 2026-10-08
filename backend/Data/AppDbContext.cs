using Microsoft.EntityFrameworkCore;
using OrquestadorApi.Models;

namespace OrquestadorApi.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Project> Projects => Set<Project>();

    public DbSet<ProjectContext> Contexts => Set<ProjectContext>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Project>()
            .HasOne(project => project.Context)
            .WithOne(context => context.Project)
            .HasForeignKey<ProjectContext>(context => context.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
