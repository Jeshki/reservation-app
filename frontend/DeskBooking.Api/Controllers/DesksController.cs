using DeskBooking.Api.Dtos;
using DeskBooking.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace DeskBooking.Api.Controllers;

[ApiController]
[Route("api/desks")]
public class DesksController : ControllerBase
{
    private readonly BookingService _service;
    public DesksController(BookingService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<List<DeskListItemDto>>> Get([FromQuery] DateOnly from, [FromQuery] DateOnly to)
        => Ok(await _service.GetDesksAsync(from, to));
}

