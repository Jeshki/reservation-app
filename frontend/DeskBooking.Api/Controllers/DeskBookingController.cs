using DeskBooking.Api.Dtos;
using DeskBooking.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace DeskBooking.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DeskBookingController : ControllerBase
{
    private readonly BookingService _service;
    public DeskBookingController(BookingService service) => _service = service;

    [HttpGet("availability")]
    public async Task<ActionResult<List<DeskListItemDto>>> GetAvailability([FromQuery] string startDate, [FromQuery] string endDate)
    {
        if (!DateOnly.TryParse(startDate, out var from) || !DateOnly.TryParse(endDate, out var to))
        {
            return BadRequest(new { message = "Invalid date range." });
        }

        return Ok(await _service.GetDesksAsync(from, to));
    }

    [HttpPost("reserve")]
    public async Task<ActionResult> Reserve([FromBody] CreateReservationRequest req)
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

    [HttpDelete("cancelWhole/{id:int}")]
    public async Task<ActionResult> CancelWhole(int id)
    {
        try
        {
            await _service.CancelWholeAsync(id);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("cancelDay/{id:int}")]
    public async Task<ActionResult> CancelDay(int id, [FromQuery] string date)
    {
        if (!DateOnly.TryParse(date, out var day))
        {
            return BadRequest(new { message = "Invalid date." });
        }

        try
        {
            await _service.CancelDayAsync(id, day);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
