using DeskBooking.Api.Dtos;
using DeskBooking.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace DeskBooking.Api.Controllers;

[ApiController]
[Route("api/profile")]
public class ProfileController : ControllerBase
{
    private readonly BookingService _service;
    public ProfileController(BookingService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<ProfileDto>> Get()
        => Ok(await _service.GetProfileAsync());

    // Support legacy route with id (ignored, current user is fixed)
    [HttpGet("{id:int}")]
    public async Task<ActionResult<ProfileDto>> GetById(int id)
        => Ok(await _service.GetProfileAsync());
}
