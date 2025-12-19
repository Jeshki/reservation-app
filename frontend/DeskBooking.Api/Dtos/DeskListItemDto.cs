using DeskBooking.Api.Domain;

namespace DeskBooking.Api.Dtos;

public class DeskListItemDto
{
    public int DeskId { get; set; }
    public int Number { get; set; }
    public DeskStatus Status { get; set; }

    public string? ReservedByFirstName { get; set; }
    public string? ReservedByLastName { get; set; }

    public string? MaintenanceMessage { get; set; }

    public int? MyReservationId { get; set; }
    public DateOnly? MyReservationStart { get; set; }
    public DateOnly? MyReservationEnd { get; set; }
}

