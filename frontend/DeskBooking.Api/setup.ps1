$ErrorActionPreference = "Stop"

function Write-File($path, $content) {
  $dir = Split-Path $path
  if ($dir -and !(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
  Set-Content -Path $path -Value $content -Encoding UTF8
  Write-Host "Wrote $path"
}

Write-File "Domain/DeskStatus.cs" @"
namespace DeskBooking.Api.Domain;

public enum DeskStatus
{
    Open = 0,
    Reserved = 1,
    Maintenance = 2
}
"@

Write-File "Domain/Desk.cs" @"
namespace DeskBooking.Api.Domain;

public class Desk
{
    public int Id { get; set; }
    public int Number { get; set; }

    public bool IsInMaintenance { get; set; }
    public string? MaintenanceMessage { get; set; }
}
"@

Write-File "Domain/User.cs" @"
namespace DeskBooking.Api.Domain;

public class User
{
    public int Id { get; set; }
    public string FirstName { get; set; } = "";
    public string LastName { get; set; } = "";
}
"@

Write-File "Domain/Reservation.cs" @"
namespace DeskBooking.Api.Domain;

public class Reservation
{
    public int Id { get; set; }

    public int DeskId { get; set; }
    public Desk Desk { get; set; } = null!;

    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; } // inclusive
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
"@

Write-File "Data/AppDbContext.cs" @"
using DeskBooking.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace DeskBooking.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) {}

    public DbSet<Desk> Desks => Set<Desk>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Reservation> Reservations => Set<Reservation>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Desk>()
            .HasIndex(d => d.Number)
            .IsUnique();

        modelBuilder.Entity<Reservation>()
            .HasOne(r => r.Desk)
            .WithMany()
            .HasForeignKey(r => r.DeskId);

        modelBuilder.Entity<Reservation>()
            .HasOne(r => r.User)
            .WithMany()
            .HasForeignKey(r => r.UserId);
    }
}
"@

Write-File "Data/SeedData.cs" @"
using DeskBooking.Api.Domain;

namespace DeskBooking.Api.Data;

public static class SeedData
{
    public static void Seed(AppDbContext db)
    {
        if (db.Desks.Any()) return;

        var user = new User { Id = 1, FirstName = "John", LastName = "Smith" };
        db.Users.Add(user);

        db.Users.Add(new User { Id = 2, FirstName = "Jane", LastName = "Doe" });

        for (int i = 1; i <= 12; i++)
        {
            db.Desks.Add(new Desk
            {
                Id = i,
                Number = 100 + i,
                IsInMaintenance = (i == 4),
                MaintenanceMessage = (i == 4) ? "Desk under maintenance." : null
            });
        }

        db.Reservations.Add(new Reservation
        {
            DeskId = 2,
            UserId = 2,
            StartDate = DateOnly.FromDateTime(DateTime.Today.AddDays(1)),
            EndDate = DateOnly.FromDateTime(DateTime.Today.AddDays(3))
        });

        db.Reservations.Add(new Reservation
        {
            DeskId = 3,
            UserId = 1,
            StartDate = DateOnly.FromDateTime(DateTime.Today),
            EndDate = DateOnly.FromDateTime(DateTime.Today.AddDays(2))
        });

        db.SaveChanges();
    }
}
"@

Write-File "Dtos/DeskListItemDto.cs" @"
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
"@

Write-File "Dtos/CreateReservationRequest.cs" @"
namespace DeskBooking.Api.Dtos;

public class CreateReservationRequest
{
    public int DeskId { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
}
"@

Write-File "Dtos/CancelDayRequest.cs" @"
namespace DeskBooking.Api.Dtos;

public class CancelDayRequest
{
    public DateOnly Date { get; set; }
}
"@

Write-File "Dtos/ProfileDto.cs" @"
namespace DeskBooking.Api.Dtos;

public class ProfileDto
{
    public string FirstName { get; set; } = "";
    public string LastName { get; set; } = "";

    public List<ReservationDto> CurrentReservations { get; set; } = [];
    public List<ReservationDto> PastReservations { get; set; } = [];
}

public class ReservationDto
{
    public int ReservationId { get; set; }
    public int DeskNumber { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
}
"@

Write-File "Services/BookingService.cs" @"
using DeskBooking.Api.Data;
using DeskBooking.Api.Domain;
using DeskBooking.Api.Dtos;
using Microsoft.EntityFrameworkCore;

namespace DeskBooking.Api.Services;

public class BookingService
{
    private readonly AppDbContext _db;
    private const int CurrentUserId = 1;

    public BookingService(AppDbContext db) => _db = db;

    private static bool Overlaps(DateOnly aStart, DateOnly aEnd, DateOnly bStart, DateOnly bEnd)
        => aStart <= bEnd && bStart <= aEnd;

    public async Task<List<DeskListItemDto>> GetDesksAsync(DateOnly from, DateOnly to)
    {
        var desks = await _db.Desks.AsNoTracking().OrderBy(d => d.Number).ToListAsync();

        var reservations = await _db.Reservations
            .Include(r => r.User)
            .AsNoTracking()
            .Where(r => Overlaps(r.StartDate, r.EndDate, from, to))
            .ToListAsync();

        var result = new List<DeskListItemDto>();

        foreach (var desk in desks)
        {
            if (desk.IsInMaintenance)
            {
                result.Add(new DeskListItemDto
                {
                    DeskId = desk.Id,
                    Number = desk.Number,
                    Status = DeskStatus.Maintenance,
                    MaintenanceMessage = desk.MaintenanceMessage
                });
                continue;
            }

            var overlapping = reservations.Where(r => r.DeskId == desk.Id).ToList();

            if (overlapping.Count == 0)
            {
                result.Add(new DeskListItemDto
                {
                    DeskId = desk.Id,
                    Number = desk.Number,
                    Status = DeskStatus.Open
                });
                continue;
            }

            var first = overlapping.First();

            var dto = new DeskListItemDto
            {
                DeskId = desk.Id,
                Number = desk.Number,
                Status = DeskStatus.Reserved,
                ReservedByFirstName = first.User.FirstName,
                ReservedByLastName = first.User.LastName
            };

            var my = overlapping.FirstOrDefault(r => r.UserId == CurrentUserId);
            if (my != null)
            {
                dto.MyReservationId = my.Id;
                dto.MyReservationStart = my.StartDate;
                dto.MyReservationEnd = my.EndDate;
            }

            result.Add(dto);
        }

        return result;
    }

    public async Task<int> ReserveAsync(CreateReservationRequest req)
    {
        if (req.StartDate > req.EndDate)
            throw new InvalidOperationException(""Invalid date range."");

        var desk = await _db.Desks.FirstOrDefaultAsync(d => d.Id == req.DeskId)
            ?? throw new InvalidOperationException(""Desk not found."");

        if (desk.IsInMaintenance)
            throw new InvalidOperationException(""Desk is in maintenance."");

        var conflict = await _db.Reservations.AnyAsync(r =>
            r.DeskId == req.DeskId && Overlaps(r.StartDate, r.EndDate, req.StartDate, req.EndDate));

        if (conflict)
            throw new InvalidOperationException(""Desk is already reserved for this period."");

        var reservation = new Reservation
        {
            DeskId = req.DeskId,
            UserId = CurrentUserId,
            StartDate = req.StartDate,
            EndDate = req.EndDate
        };

        _db.Reservations.Add(reservation);
        await _db.SaveChangesAsync();

        return reservation.Id;
    }

    public async Task CancelWholeAsync(int reservationId)
    {
        var r = await _db.Reservations.FirstOrDefaultAsync(x => x.Id == reservationId)
            ?? throw new InvalidOperationException(""Reservation not found."");

        if (r.UserId != CurrentUserId)
            throw new InvalidOperationException(""You cannot cancel another user's reservation."");

        _db.Reservations.Remove(r);
        await _db.SaveChangesAsync();
    }

    public async Task CancelDayAsync(int reservationId, DateOnly date)
    {
        var r = await _db.Reservations.FirstOrDefaultAsync(x => x.Id == reservationId)
            ?? throw new InvalidOperationException(""Reservation not found."");

        if (r.UserId != CurrentUserId)
            throw new InvalidOperationException(""You cannot cancel another user's reservation."");

        if (date < r.StartDate || date > r.EndDate)
            throw new InvalidOperationException(""Date is outside the reservation range."");

        if (r.StartDate == r.EndDate)
        {
            _db.Reservations.Remove(r);
            await _db.SaveChangesAsync();
            return;
        }

        if (date == r.StartDate)
        {
            r.StartDate = r.StartDate.AddDays(1);
            await _db.SaveChangesAsync();
            return;
        }

        if (date == r.EndDate)
        {
            r.EndDate = r.EndDate.AddDays(-1);
            await _db.SaveChangesAsync();
            return;
        }

        var leftStart = r.StartDate;
        var leftEnd = date.AddDays(-1);
        var rightStart = date.AddDays(1);
        var rightEnd = r.EndDate;

        r.StartDate = leftStart;
        r.EndDate = leftEnd;

        _db.Reservations.Add(new Reservation
        {
            DeskId = r.DeskId,
            UserId = r.UserId,
            StartDate = rightStart,
            EndDate = rightEnd
        });

        await _db.SaveChangesAsync();
    }

    public async Task<ProfileDto> GetProfileAsync()
    {
        var user = await _db.Users.AsNoTracking().FirstAsync(u => u.Id == CurrentUserId);
        var today = DateOnly.FromDateTime(DateTime.Today);

        var reservations = await _db.Reservations
            .Include(r => r.Desk)
            .AsNoTracking()
            .Where(r => r.UserId == CurrentUserId)
            .OrderByDescending(r => r.StartDate)
            .ToListAsync();

        var dto = new ProfileDto
        {
            FirstName = user.FirstName,
            LastName = user.LastName
        };

        foreach (var r in reservations)
        {
            var item = new ReservationDto
            {
                ReservationId = r.Id,
                DeskNumber = r.Desk.Number,
                StartDate = r.StartDate,
                EndDate = r.EndDate
            };

            if (r.EndDate >= today) dto.CurrentReservations.Add(item);
            else dto.PastReservations.Add(item);
        }

        return dto;
    }
}
"@

Write-File "Controllers/DesksController.cs" @"
using DeskBooking.Api.Dtos;
using DeskBooking.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace DeskBooking.Api.Controllers;

[ApiController]
[Route(""api/desks"")]
public class DesksController : ControllerBase
{
    private readonly BookingService _service;
    public DesksController(BookingService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<List<DeskListItemDto>>> Get([FromQuery] DateOnly from, [FromQuery] DateOnly to)
        => Ok(await _service.GetDesksAsync(from, to));
}
"@

Write-File "Controllers/ReservationsController.cs" @"
using DeskBooking.Api.Dtos;
using DeskBooking.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace DeskBooking.Api.Controllers;

[ApiController]
[Route(""api/reservations"")]
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

    [HttpDelete(""{id:int}"")]
    public async Task<ActionResult> CancelWhole(int id)
    {
        try { await _service.CancelWholeAsync(id); return NoContent(); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPost(""{id:int}/cancel-day"")]
    public async Task<ActionResult> CancelDay(int id, CancelDayRequest req)
    {
        try { await _service.CancelDayAsync(id, req.Date); return NoContent(); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }
}
"@

Write-File "Controllers/ProfileController.cs" @"
using DeskBooking.Api.Dtos;
using DeskBooking.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace DeskBooking.Api.Controllers;

[ApiController]
[Route(""api/profile"")]
public class ProfileController : ControllerBase
{
    private readonly BookingService _service;
    public ProfileController(BookingService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<ProfileDto>> Get()
        => Ok(await _service.GetProfileAsync());
}
"@

Write-File "Program.cs" @"
using DeskBooking.Api.Data;
using DeskBooking.Api.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseInMemoryDatabase(""DeskBookingDb""));

builder.Services.AddScoped<BookingService>();

builder.Services.AddCors(opt =>
{
    opt.AddPolicy(""frontend"", p => p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());
});

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();

app.UseCors(""frontend"");

app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    SeedData.Seed(db);
}

app.Run();
"@

Write-Host "`nDone. Now run: dotnet run"
