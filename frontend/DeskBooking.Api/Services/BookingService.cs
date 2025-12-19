using AutoMapper;
using DeskBooking.Api.Data;
using DeskBooking.Api.Domain;
using DeskBooking.Api.Dtos;
using Microsoft.EntityFrameworkCore;
using System.Linq;

namespace DeskBooking.Api.Services;

public class BookingService
{
    private readonly AppDbContext _db;
    private readonly IMapper _mapper;
    // Hard-coded user for demo flows.
    private const int CurrentUserId = 1;

    public BookingService(AppDbContext db, IMapper mapper)
    {
        _db = db;
        _mapper = mapper;
    }

    private static IEnumerable<DateOnly> EnumerateDays(DateOnly start, DateOnly end)
    {
        for (var day = start; day <= end; day = day.AddDays(1))
            yield return day;
    }

    public async Task<List<DeskListItemDto>> GetDesksAsync(DateOnly from, DateOnly to)
    {
        var desks = await _db.Desks.AsNoTracking().OrderBy(d => d.Number).ToListAsync();

        // Load reservation days once for the requested window to avoid per-desk queries.
        var reservationDays = await _db.ReservationDays
            .Include(rd => rd.Reservation)
                .ThenInclude(r => r.User)
            .AsNoTracking()
            .Where(rd => rd.Date >= from && rd.Date <= to && !rd.IsCancelled)
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

            var overlappingDays = reservationDays.Where(rd => rd.DeskId == desk.Id).ToList();

            if (overlappingDays.Count == 0)
            {
                result.Add(new DeskListItemDto
                {
                    DeskId = desk.Id,
                    Number = desk.Number,
                    Status = DeskStatus.Open
                });
                continue;
            }

            var firstDay = overlappingDays.OrderBy(rd => rd.Date).First();

            var first = firstDay.Reservation;

            var dto = new DeskListItemDto
            {
                DeskId = desk.Id,
                Number = desk.Number,
                Status = DeskStatus.Reserved,
                ReservedByFirstName = first.User.FirstName,
                ReservedByLastName = first.User.LastName
            };

            // Mark the active user's reservation so the UI can render actions.
            var myDay = overlappingDays.FirstOrDefault(rd => rd.Reservation.UserId == CurrentUserId);
            if (myDay != null)
            {
                var myReservation = myDay.Reservation;
                dto.MyReservationId = myReservation.Id;
                dto.MyReservationStart = myReservation.StartDate;
                dto.MyReservationEnd = myReservation.EndDate;
            }

            result.Add(dto);
        }

        return result;
    }

    public async Task<int> ReserveAsync(CreateReservationRequest req)
    {
        if (req.StartDate > req.EndDate)
            throw new InvalidOperationException("Invalid date range.");

        var desk = await _db.Desks.FirstOrDefaultAsync(d => d.Id == req.DeskId)
            ?? throw new InvalidOperationException("Desk not found.");

        if (desk.IsInMaintenance)
            throw new InvalidOperationException("Desk is in maintenance.");

        var conflict = await _db.ReservationDays
            .AnyAsync(rd => rd.DeskId == req.DeskId &&
                            !rd.IsCancelled &&
                            rd.Date >= req.StartDate &&
                            rd.Date <= req.EndDate);

        if (conflict)
            throw new InvalidOperationException("Desk is already reserved for this period.");

        var reservation = new Reservation
        {
            DeskId = req.DeskId,
            UserId = CurrentUserId,
            StartDate = req.StartDate,
            EndDate = req.EndDate
        };

        foreach (var date in EnumerateDays(req.StartDate, req.EndDate))
        {
            reservation.ReservationDays.Add(new ReservationDay
            {
                DeskId = reservation.DeskId,
                Date = date
            });
        }

        _db.Reservations.Add(reservation);
        await _db.SaveChangesAsync();

        return reservation.Id;
    }


    public async Task CancelWholeAsync(int reservationId)
    {
        var reservation = await _db.Reservations
            .Include(r => r.ReservationDays)
            .FirstOrDefaultAsync(x => x.Id == reservationId)
            ?? throw new InvalidOperationException("Reservation not found.");

        if (reservation.UserId != CurrentUserId)
            throw new InvalidOperationException("You cannot cancel another user's reservation.");

        reservation.IsCancelled = true;
        foreach (var day in reservation.ReservationDays)
        {
            day.IsCancelled = true;
        }

        await _db.SaveChangesAsync();
    }

    public async Task CancelDayAsync(int reservationId, DateOnly date)
    {
        var reservation = await _db.Reservations
            .Include(r => r.ReservationDays)
            .FirstOrDefaultAsync(x => x.Id == reservationId)
            ?? throw new InvalidOperationException("Reservation not found.");

        if (reservation.UserId != CurrentUserId)
            throw new InvalidOperationException("You cannot cancel another user's reservation.");

        var day = reservation.ReservationDays.FirstOrDefault(rd => rd.Date == date);
        if (day == null || day.IsCancelled)
            throw new InvalidOperationException("Reservation day not found or already canceled.");

        day.IsCancelled = true;
        reservation.IsCancelled = reservation.ReservationDays.All(rd => rd.IsCancelled);

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
            var item = _mapper.Map<ReservationDto>(r);

            if (r.IsCancelled)
            {
                dto.CancelledReservations.Add(item);
                continue;
            }

            if (r.EndDate >= today) dto.CurrentReservations.Add(item);
            else dto.PastReservations.Add(item);
        }

        return dto;
    }
}
