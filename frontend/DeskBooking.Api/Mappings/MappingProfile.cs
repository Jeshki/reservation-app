using AutoMapper;
using DeskBooking.Api.Domain;
using DeskBooking.Api.Dtos;

namespace DeskBooking.Api.Mappings;

/// <summary>
/// Centralizes AutoMapper configuration for DTO conversions.
/// </summary>
public class MappingProfile : Profile
{
    public MappingProfile()
    {
        CreateMap<Reservation, ReservationDto>()
            .ForMember(dest => dest.DeskNumber, opt => opt.MapFrom(src => src.Desk.Number));
    }
}
