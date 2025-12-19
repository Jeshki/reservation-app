using AutoMapper;
using DeskBooking.Api.Controllers;
using DeskBooking.Api.Data;
using DeskBooking.Api.Dtos;
using DeskBooking.Api.Mappings;
using DeskBooking.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DeskBooking.Api.Tests;

public class ControllersTests
{
    private static AppDbContext BuildContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var db = new AppDbContext(options);
        SeedData.Seed(db);
        return db;
    }

    private static IMapper CreateMapper()
    {
        var config = new MapperConfiguration(cfg => cfg.AddProfile<MappingProfile>());
        return config.CreateMapper();
    }

    [Fact]
    public async Task DesksController_returns_desks()
    {
        using var db = BuildContext();
        var controller = new DesksController(new BookingService(db, CreateMapper()));

        var result = await controller.Get(DateOnly.FromDateTime(DateTime.Today), DateOnly.FromDateTime(DateTime.Today.AddDays(2)));

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var desks = Assert.IsAssignableFrom<List<DeskListItemDto>>(ok.Value);
        Assert.NotEmpty(desks);
    }

    [Fact]
    public async Task ProfileController_returns_profile()
    {
        using var db = BuildContext();
        var controller = new ProfileController(new BookingService(db, CreateMapper()));

        var result = await controller.Get();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var profile = Assert.IsType<ProfileDto>(ok.Value);
        Assert.False(string.IsNullOrWhiteSpace(profile.FirstName));
    }

    [Fact]
    public async Task ReservationsController_creates_reservation_and_handles_conflict()
    {
        using var db = BuildContext();
        var service = new BookingService(db, CreateMapper());
        var controller = new ReservationsController(service);

        var createResult = await controller.Create(new CreateReservationRequest
        {
            DeskId = 5,
            StartDate = DateOnly.FromDateTime(DateTime.Today.AddDays(5)),
            EndDate = DateOnly.FromDateTime(DateTime.Today.AddDays(6))
        });

        var ok = Assert.IsType<OkObjectResult>(createResult);
        Assert.NotNull(ok.Value);
        if (ok.Value is int id)
        {
            Assert.True(id > 0);
        }
        else if (ok.Value is IDictionary<string, object> payload)
        {
            Assert.True(payload.ContainsKey("reservationId"));
            Assert.NotNull(payload["reservationId"]);
        }
        else
        {
            var prop = ok.Value.GetType().GetProperty("reservationId");
            Assert.NotNull(prop);
            Assert.NotNull(prop.GetValue(ok.Value));
        }

        // conflict on same dates
        var conflict = await controller.Create(new CreateReservationRequest
        {
            DeskId = 5,
            StartDate = DateOnly.FromDateTime(DateTime.Today.AddDays(5)),
            EndDate = DateOnly.FromDateTime(DateTime.Today.AddDays(6))
        });
        Assert.IsType<BadRequestObjectResult>(conflict);
    }

    [Fact]
    public async Task ReservationsController_cancel_whole_and_day()
    {
        using var db = BuildContext();
        var service = new BookingService(db, CreateMapper());
        var controller = new ReservationsController(service);

        var resId = await service.ReserveAsync(new CreateReservationRequest
        {
            DeskId = 6,
            StartDate = DateOnly.FromDateTime(DateTime.Today.AddDays(1)),
            EndDate = DateOnly.FromDateTime(DateTime.Today.AddDays(3))
        });

        var cancelDayResult = await controller.CancelDay(resId, new CancelDayRequest
        {
            Date = DateOnly.FromDateTime(DateTime.Today.AddDays(2))
        });
        Assert.IsType<NoContentResult>(cancelDayResult);

        var cancelWholeResult = await controller.CancelWhole(resId);
        Assert.IsType<NoContentResult>(cancelWholeResult);
    }
}
