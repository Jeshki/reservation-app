// src/types.ts

export enum DeskStatus {
  Open = 0,
  Reserved = 1,
  Maintenance = 2,
}

export interface DeskListItemDto {
  deskId: number;
  number: number;
  status: DeskStatus;
  reservedByFirstName?: string;
  reservedByLastName?: string;
  maintenanceMessage?: string;
  myReservationId?: number;
  myReservationStart?: string;
  myReservationEnd?: string;
}

export interface CreateReservationRequest {
  deskId: number;
  startDate: string;
  endDate: string;
}

// Used by the profile page.
export interface ReservationDto {
  reservationId: number;
  deskNumber: number;
  startDate: string;
  endDate: string;
}

export interface ProfileDto {
  firstName: string;
  lastName: string;
  currentReservations: ReservationDto[];
  pastReservations: ReservationDto[];
}
