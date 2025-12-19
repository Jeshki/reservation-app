using DeskBooking.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace DeskBooking.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) {}

    public DbSet<Desk> Desks => Set<Desk>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Reservation> Reservations => Set<Reservation>();
    public DbSet<ReservationDay> ReservationDays => Set<ReservationDay>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Desk>()
            .HasIndex(d => d.Number)
            .IsUnique();

        modelBuilder.Entity<Reservation>()
            .HasOne(r => r.Desk)
            .WithMany()
            .HasForeignKey(r => r.DeskId);

        modelBuilder.Entity<Reservation>()
            .HasOne(r => r.User)
            .WithMany()
            .HasForeignKey(r => r.UserId);

        modelBuilder.Entity<ReservationDay>()
            .HasOne(rd => rd.Reservation)
            .WithMany(r => r.ReservationDays)
            .HasForeignKey(rd => rd.ReservationId);

        modelBuilder.Entity<ReservationDay>()
            .HasOne(rd => rd.Desk)
            .WithMany()
            .HasForeignKey(rd => rd.DeskId);
    }
}

