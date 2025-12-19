using AutoMapper;
using DeskBooking.Api.Data;
using DeskBooking.Api.Domain;
using DeskBooking.Api.Dtos;
using DeskBooking.Api.Mappings;
using DeskBooking.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace DeskBooking.Api.Tests;

public class BookingServiceTests
{
    private static DbContextOptions<AppDbContext> CreateOptions() =>
        new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

    private static IMapper CreateMapper()
    {
        var config = new MapperConfiguration(cfg => cfg.AddProfile<MappingProfile>());
        return config.CreateMapper();
    }

    private static AppDbContext BuildContextWithSeed(
        Action<AppDbContext>? seed = null)
    {
        var ctx = new AppDbContext(CreateOptions());
        ctx.Users.Add(new User { Id = 1, FirstName = "John", LastName = "Smith" });
        ctx.Users.Add(new User { Id = 2, FirstName = "Jane", LastName = "Doe" });
        ctx.Desks.AddRange(
            new Desk { Id = 1, Number = 1, IsInMaintenance = false },
            new Desk { Id = 2, Number = 2, IsInMaintenance = false },
            new Desk { Id = 3, Number = 3, IsInMaintenance = true, MaintenanceMessage = "Fixed soon" }
        );
        seed?.Invoke(ctx);
        ctx.SaveChanges();
        return ctx;
    }

    [Fact]
    public async Task GetDesksAsync_returns_open_reserved_maintenance_states()
    {
        using var ctx = BuildContextWithSeed(db =>
        {
            var res = new Reservation
            {
                Id = 10,
                DeskId = 1,
                UserId = 2,
                StartDate = new DateOnly(2025, 12, 10),
                EndDate = new DateOnly(2025, 12, 12)
            };
            res.ReservationDays.AddRange(new[]
            {
                new ReservationDay { DeskId = 1, Date = new DateOnly(2025, 12, 10) },
                new ReservationDay { DeskId = 1, Date = new DateOnly(2025, 12, 11) },
                new ReservationDay { DeskId = 1, Date = new DateOnly(2025, 12, 12) },
            });
            db.Reservations.Add(res);
            db.ReservationDays.AddRange(res.ReservationDays);
        });

        var service = new BookingService(ctx, CreateMapper());

        var result = await service.GetDesksAsync(
            new DateOnly(2025, 12, 10), new DateOnly(2025, 12, 11));

        Assert.Equal(3, result.Count);

        var reserved = result.Single(d => d.DeskId == 1);
        Assert.Equal(DeskStatus.Reserved, reserved.Status);
        Assert.Equal("Jane", reserved.ReservedByFirstName);
        Assert.Null(reserved.MyReservationId);

        var open = result.Single(d => d.DeskId == 2);
        Assert.Equal(DeskStatus.Open, open.Status);

        var maint = result.Single(d => d.DeskId == 3);
        Assert.Equal(DeskStatus.Maintenance, maint.Status);
        Assert.Equal("Fixed soon", maint.MaintenanceMessage);
    }

    [Fact]
    public async Task GetDesksAsync_marks_my_reservation_details()
    {
        using var ctx = BuildContextWithSeed(db =>
        {
            var res = new Reservation
            {
                Id = 11,
                DeskId = 2,
                UserId = 1,
                StartDate = new DateOnly(2025, 12, 5),
                EndDate = new DateOnly(2025, 12, 7)
            };
            res.ReservationDays.AddRange(new[]
            {
                new ReservationDay { DeskId = 2, Date = new DateOnly(2025, 12, 5) },
                new ReservationDay { DeskId = 2, Date = new DateOnly(2025, 12, 6) },
                new ReservationDay { DeskId = 2, Date = new DateOnly(2025, 12, 7) },
            });
            db.Reservations.Add(res);
            db.ReservationDays.AddRange(res.ReservationDays);
        });

        var service = new BookingService(ctx, CreateMapper());

        var desks = await service.GetDesksAsync(
            new DateOnly(2025, 12, 5), new DateOnly(2025, 12, 7));

        var my = desks.Single(d => d.DeskId == 2);
        Assert.Equal(DeskStatus.Reserved, my.Status);
        Assert.Equal(11, my.MyReservationId);
        Assert.Equal(new DateOnly(2025, 12, 5), my.MyReservationStart);
        Assert.Equal(new DateOnly(2025, 12, 7), my.MyReservationEnd);
    }

    [Fact]
    public async Task ReserveAsync_creates_reservation_and_days()
    {
        using var ctx = BuildContextWithSeed();
        var service = new BookingService(ctx, CreateMapper());

        var id = await service.ReserveAsync(new CreateReservationRequest
        {
            DeskId = 2,
            StartDate = new DateOnly(2025, 12, 1),
            EndDate = new DateOnly(2025, 12, 3)
        });

        var reservation = await ctx.Reservations.Include(r => r.ReservationDays).FirstAsync();
        Assert.Equal(id, reservation.Id);
        Assert.Equal(3, reservation.ReservationDays.Count);
        Assert.Contains(reservation.ReservationDays, rd => rd.Date == new DateOnly(2025, 12, 1));
        Assert.Contains(reservation.ReservationDays, rd => rd.Date == new DateOnly(2025, 12, 2));
        Assert.Contains(reservation.ReservationDays, rd => rd.Date == new DateOnly(2025, 12, 3));
    }

    [Fact]
    public async Task ReserveAsync_throws_on_bad_interval_or_conflict_or_maintenance()
    {
        using var ctx = BuildContextWithSeed(db =>
        {
            db.ReservationDays.Add(new ReservationDay
            {
                Id = 5,
                DeskId = 2,
                Date = new DateOnly(2025, 12, 10),
                IsCancelled = false,
                Reservation = new Reservation
                {
                    Id = 20,
                    DeskId = 2,
                    UserId = 2,
                    StartDate = new DateOnly(2025, 12, 10),
                    EndDate = new DateOnly(2025, 12, 12)
                }
            });
        });

        var service = new BookingService(ctx, CreateMapper());

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.ReserveAsync(new CreateReservationRequest
        {
            DeskId = 2,
            StartDate = new DateOnly(2025, 12, 12),
            EndDate = new DateOnly(2025, 12, 10)
        }));

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.ReserveAsync(new CreateReservationRequest
        {
            DeskId = 3,
            StartDate = new DateOnly(2025, 12, 10),
            EndDate = new DateOnly(2025, 12, 11)
        }));

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.ReserveAsync(new CreateReservationRequest
        {
            DeskId = 2,
            StartDate = new DateOnly(2025, 12, 10),
            EndDate = new DateOnly(2025, 12, 11)
        }));
    }

    [Fact]
    public async Task CancelWholeAsync_marks_reservation_and_days_cancelled()
    {
        using var ctx = BuildContextWithSeed(db =>
        {
            var res = new Reservation
            {
                Id = 30,
                DeskId = 2,
                UserId = 1,
                StartDate = new DateOnly(2025, 12, 1),
                EndDate = new DateOnly(2025, 12, 2),
                ReservationDays =
                {
                    new ReservationDay { DeskId = 2, Date = new DateOnly(2025, 12, 1) },
                    new ReservationDay { DeskId = 2, Date = new DateOnly(2025, 12, 2) },
                }
            };
            db.Reservations.Add(res);
            db.ReservationDays.AddRange(res.ReservationDays);
        });

        var service = new BookingService(ctx, CreateMapper());
        await service.CancelWholeAsync(30);

        var resReloaded = await ctx.Reservations.Include(r => r.ReservationDays).SingleAsync();
        Assert.True(resReloaded.IsCancelled);
        Assert.All(resReloaded.ReservationDays, rd => Assert.True(rd.IsCancelled));
    }

    [Fact]
    public async Task CancelWholeAsync_blocks_other_user()
    {
        using var ctx = BuildContextWithSeed(db =>
        {
            db.Reservations.Add(new Reservation
            {
                Id = 31,
                DeskId = 1,
                UserId = 2,
                StartDate = new DateOnly(2025, 12, 1),
                EndDate = new DateOnly(2025, 12, 1)
            });
        });

        var service = new BookingService(ctx, CreateMapper());
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.CancelWholeAsync(31));
    }

    [Fact]
    public async Task CancelDayAsync_cancels_single_day_and_sets_whole_cancel_when_last()
    {
        using var ctx = BuildContextWithSeed(db =>
        {
            var res = new Reservation
            {
                Id = 40,
                DeskId = 2,
                UserId = 1,
                StartDate = new DateOnly(2025, 12, 1),
                EndDate = new DateOnly(2025, 12, 3),
                ReservationDays =
                {
                    new ReservationDay { DeskId = 2, Date = new DateOnly(2025, 12, 1) },
                    new ReservationDay { DeskId = 2, Date = new DateOnly(2025, 12, 2) },
                    new ReservationDay { DeskId = 2, Date = new DateOnly(2025, 12, 3) },
                }
            };
            db.Reservations.Add(res);
            db.ReservationDays.AddRange(res.ReservationDays);
        });

        var service = new BookingService(ctx, CreateMapper());

        await service.CancelDayAsync(40, new DateOnly(2025, 12, 2));

        var resAfter = await ctx.Reservations.Include(r => r.ReservationDays).SingleAsync();
        Assert.False(resAfter.IsCancelled);
        Assert.True(resAfter.ReservationDays.Single(rd => rd.Date.Day == 2).IsCancelled);

        await service.CancelDayAsync(40, new DateOnly(2025, 12, 1));
        await service.CancelDayAsync(40, new DateOnly(2025, 12, 3));

        var final = await ctx.Reservations.Include(r => r.ReservationDays).SingleAsync();
        Assert.True(final.IsCancelled);
        Assert.All(final.ReservationDays, rd => Assert.True(rd.IsCancelled));
    }

    [Fact]
    public async Task CancelDayAsync_blocks_other_user_and_missing_day()
    {
        using var ctx = BuildContextWithSeed(db =>
        {
            db.Reservations.Add(new Reservation
            {
                Id = 41,
                DeskId = 1,
                UserId = 2,
                StartDate = new DateOnly(2025, 12, 1),
                EndDate = new DateOnly(2025, 12, 1),
                ReservationDays = { new ReservationDay { DeskId = 1, Date = new DateOnly(2025, 12, 1) } }
            });
        });

        var service = new BookingService(ctx, CreateMapper());
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.CancelDayAsync(41, new DateOnly(2025, 12, 1)));

        using var ctx2 = BuildContextWithSeed(db =>
        {
            db.Reservations.Add(new Reservation
            {
                Id = 42,
                DeskId = 1,
                UserId = 1,
                StartDate = new DateOnly(2025, 12, 1),
                EndDate = new DateOnly(2025, 12, 1),
                ReservationDays = { new ReservationDay { DeskId = 1, Date = new DateOnly(2025, 12, 1), IsCancelled = true } }
            });
        });

        var service2 = new BookingService(ctx2, CreateMapper());
        await Assert.ThrowsAsync<InvalidOperationException>(() => service2.CancelDayAsync(42, new DateOnly(2025, 12, 1)));
    }

    [Fact]
    public async Task GetProfileAsync_splits_current_and_past()
    {
        using var ctx = BuildContextWithSeed(db =>
        {
            db.Reservations.AddRange(
                new Reservation
                {
                    Id = 50,
                    DeskId = 1,
                    UserId = 1,
                    StartDate = DateOnly.FromDateTime(DateTime.Today.AddDays(-2)),
                    EndDate = DateOnly.FromDateTime(DateTime.Today.AddDays(1))
                },
                new Reservation
                {
                    Id = 51,
                    DeskId = 2,
                    UserId = 1,
                    StartDate = DateOnly.FromDateTime(DateTime.Today.AddDays(-10)),
                    EndDate = DateOnly.FromDateTime(DateTime.Today.AddDays(-5))
                }
            );
        });

        var service = new BookingService(ctx, CreateMapper());
        var profile = await service.GetProfileAsync();

        Assert.Equal("John", profile.FirstName);
        Assert.Single(profile.CurrentReservations);
        Assert.Single(profile.PastReservations);
        Assert.Equal(50, profile.CurrentReservations.Single().ReservationId);
        Assert.Equal(1, profile.CurrentReservations.Single().DeskNumber);
        Assert.Equal(51, profile.PastReservations.Single().ReservationId);
        Assert.Equal(2, profile.PastReservations.Single().DeskNumber);
    }
}
