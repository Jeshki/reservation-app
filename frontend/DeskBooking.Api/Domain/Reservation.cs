namespace DeskBooking.Api.Domain;

public class Reservation
{
    public int Id { get; set; }

    public int DeskId { get; set; }
    public Desk Desk { get; set; } = null!;

    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; } // inclusive
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public bool IsCancelled { get; set; }

    public List<ReservationDay> ReservationDays { get; set; } = new();
}

public class ReservationDay
{
    public int Id { get; set; }

    public int ReservationId { get; set; }
    public Reservation Reservation { get; set; } = null!;

    public int DeskId { get; set; }
    public Desk Desk { get; set; } = null!;

    public DateOnly Date { get; set; }
    public bool IsCancelled { get; set; }
}

