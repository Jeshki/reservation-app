namespace DeskBooking.Api.Dtos;

public class CreateReservationRequest
{
    public int DeskId { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
}

