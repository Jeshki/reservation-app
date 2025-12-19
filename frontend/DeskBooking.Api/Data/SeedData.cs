using DeskBooking.Api.Domain;

namespace DeskBooking.Api.Data;

public static class SeedData
{
    public static void Seed(AppDbContext db)
    {
        // Seed sample data for local development.
        if (db.Desks.Any()) return;

        var user = new User { Id = 1, FirstName = "John", LastName = "Smith" };
        db.Users.Add(user);

        db.Users.Add(new User { Id = 2, FirstName = "Jane", LastName = "Doe" });
        db.Users.Add(new User { Id = 3, FirstName = "Michael", LastName = "Brown" });
        for (int i = 1; i <= 12; i++)
        {
            db.Desks.Add(new Desk
            {
                Id = i,
                Number = 100 + i,
                IsInMaintenance = (i == 4),
                MaintenanceMessage = (i == 4) ? "Desk under maintenance." : null
            });
        }

        var reservations = new[]
        {
            new Reservation
            {
                DeskId = 2,
                UserId = 2,
                StartDate = DateOnly.FromDateTime(DateTime.Today.AddDays(1)),
                EndDate = DateOnly.FromDateTime(DateTime.Today.AddDays(3))
            },
            new Reservation
            {
                DeskId = 3,
                UserId = 1,
                StartDate = DateOnly.FromDateTime(DateTime.Today),
                EndDate = DateOnly.FromDateTime(DateTime.Today.AddDays(2))
            }
        };

        db.Reservations.AddRange(reservations);
        db.SaveChanges();

        foreach (var reservation in reservations)
        {
            SeedDays(db, reservation);
        }
    }

    private static void SeedDays(AppDbContext db, Reservation reservation)
    {
        for (var date = reservation.StartDate; date <= reservation.EndDate; date = date.AddDays(1))
        {
            db.ReservationDays.Add(new ReservationDay
            {
                ReservationId = reservation.Id,
                DeskId = reservation.DeskId,
                Date = date
            });
        }
        db.SaveChanges();
    }
}

