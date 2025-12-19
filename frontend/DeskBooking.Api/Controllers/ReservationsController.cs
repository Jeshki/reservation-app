using DeskBooking.Api.Dtos;
using DeskBooking.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace DeskBooking.Api.Controllers;

[ApiController]
[Route("api/reservations")]
public class ReservationsController : ControllerBase
{
    private readonly BookingService _service;
    public ReservationsController(BookingService service) => _service = service;

    [HttpPost]
    public async Task<ActionResult> Create(CreateReservationRequest req)
    {
        try
        {
            var id = await _service.ReserveAsync(req);
            return Ok(new { reservationId = id });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult> CancelWhole(int id)
    {
        try { await _service.CancelWholeAsync(id); return NoContent(); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPost("{id:int}/cancel-day")]
    public async Task<ActionResult> CancelDay(int id, CancelDayRequest req)
    {
        try { await _service.CancelDayAsync(id, req.Date); return NoContent(); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }
}

