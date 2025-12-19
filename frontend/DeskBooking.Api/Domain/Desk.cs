namespace DeskBooking.Api.Domain;

public class Desk
{
    public int Id { get; set; }
    public int Number { get; set; }

    public bool IsInMaintenance { get; set; }
    public string? MaintenanceMessage { get; set; }
}

