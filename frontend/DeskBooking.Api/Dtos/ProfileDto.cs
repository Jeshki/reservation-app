namespace DeskBooking.Api.Dtos;

public class ProfileDto
{
    public string FirstName { get; set; } = "";
    public string LastName { get; set; } = "";

    public List<ReservationDto> CurrentReservations { get; set; } = new();
    public List<ReservationDto> PastReservations { get; set; } = new();
}

public class ReservationDto
{
    public int ReservationId { get; set; }
    public int DeskNumber { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
}

