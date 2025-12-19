import { useMemo, useState } from 'react';
import clsx from 'clsx';
import {
  CalendarDaysIcon,
  CheckCircleIcon,
  LockClosedIcon,
  TrashIcon,
  UserIcon,
  WrenchScrewdriverIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import type { DeskListItemDto } from '../types';
import { DeskStatus } from '../types';
import { generateDates } from './deskCardHelpers';

type DeskStatusName = 'Open' | 'Reserved' | 'Maintenance';

const resolveStatusName = (status: DeskStatus | string): DeskStatusName => {
  if (status === DeskStatus.Reserved || status === 'Reserved') return 'Reserved';
  if (status === DeskStatus.Maintenance || status === 'Maintenance') return 'Maintenance';
  return 'Open';
};

interface Props {
  desk: DeskListItemDto;
  currentDate: string;
  isSelected: boolean;
  onSelect: (deskId: number) => void;
  onReserve: (deskId: number) => void;
  onCancelWhole: (reservationId: number) => void;
  onCancelDay: (reservationId: number, date: string) => void;
}

export function DeskCard({ desk, currentDate, isSelected, onSelect, onReserve, onCancelWhole, onCancelDay }: Props) {
  const statusName = resolveStatusName(desk.status);
  const isOpen = statusName === 'Open';
  const isReserved = statusName === 'Reserved';
  const isMaintenance = statusName === 'Maintenance';
  const isMyReservation = isReserved && desk.myReservationId != null;
  const [isHovered, setIsHovered] = useState(false);
  const StatusIcon = isOpen ? CheckCircleIcon : isReserved ? LockClosedIcon : WrenchScrewdriverIcon;
  const statusLabel = isOpen ? 'Available' : isReserved ? 'Reserved' : 'Maintenance';
  const tone = isOpen ? 'open' : isReserved ? 'reserved' : 'maintenance';

  const toneStyles = {
    open: {
      card: 'border-emerald-200/70 bg-white/90 shadow-sm hover:shadow-lg hover:-translate-y-0.5',
      glow: 'bg-gradient-to-br from-emerald-50 via-white to-emerald-100/70',
      badge: 'bg-emerald-100 text-emerald-700',
      accentText: 'text-emerald-700',
      surface: 'border-emerald-200/70 bg-emerald-50/70',
      chair: 'border-emerald-100 bg-white/90',
      button: 'bg-emerald-600 hover:bg-emerald-700',
      ring: 'focus-within:ring-emerald-200',
    },
    reserved: {
      card: 'border-rose-200/70 bg-white/90 shadow-sm',
      glow: 'bg-gradient-to-br from-rose-50 via-white to-rose-100/70',
      badge: 'bg-rose-100 text-rose-700',
      accentText: 'text-rose-700',
      surface: 'border-rose-200/70 bg-rose-50/70',
      chair: 'border-rose-100 bg-white/90',
      button: 'bg-rose-600 hover:bg-rose-700',
      ring: 'focus-within:ring-rose-200',
    },
    maintenance: {
      card: 'border-slate-200/70 bg-white/90 opacity-80 cursor-not-allowed',
      glow: 'bg-gradient-to-br from-slate-100 via-white to-slate-200/70',
      badge: 'bg-slate-200 text-slate-700',
      accentText: 'text-slate-600',
      surface: 'border-slate-200/70 bg-slate-100/70',
      chair: 'border-slate-200 bg-white/80',
      button: 'bg-slate-500 hover:bg-slate-600',
      ring: 'focus-within:ring-slate-200',
    },
  }[tone];

  // Build the selectable date list for the user's reservation.
  const reservationDates = useMemo(
    () => generateDates(desk.myReservationStart, desk.myReservationEnd),
    [desk.myReservationStart, desk.myReservationEnd]
  );

  const [selectedDate, setSelectedDate] = useState(() => reservationDates[0] ?? currentDate);
  const normalizedSelectedDate = reservationDates.includes(selectedDate)
    ? selectedDate
    : (reservationDates[0] ?? currentDate);

  const reservedPerson =
    desk.reservedByFirstName || desk.reservedByLastName ? `${desk.reservedByFirstName ?? ''} ${desk.reservedByLastName ?? ''}`.trim() : null;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(desk.deskId);
    }
  };

  return (
    <div
      className={clsx(
        'group relative h-auto sm:h-[18rem] overflow-hidden rounded-2xl border p-4 sm:p-5 transition-all focus-ring',
        toneStyles.card,
        toneStyles.ring,
        isSelected && 'ring-2 ring-amber-400 shadow-[0_0_0_4px_rgba(245,158,11,0.15)]'
      )}
      data-testid={`desk-card-${desk.deskId}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      onClick={() => onSelect(desk.deskId)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className={clsx('absolute inset-0 opacity-80', toneStyles.glow)} aria-hidden />

      <div className="relative z-10 flex h-full flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className={clsx('inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold', toneStyles.badge)}>
              <StatusIcon className="h-4 w-4" />
              {statusLabel}
            </span>
            {isMyReservation && (
              <span className="rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-1 text-xs font-semibold">
                My desk
              </span>
            )}
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Desk</div>
            <div className={clsx('text-3xl sm:text-4xl font-semibold tracking-tight', toneStyles.accentText)}>
              {desk.number}
            </div>
          </div>

          <div className="flex items-center justify-center">
            <div className={clsx('relative h-16 w-32 sm:h-20 sm:w-36 rounded-2xl border shadow-sm', toneStyles.surface)}>
              <div className="absolute left-1/2 top-2 h-4 w-12 -translate-x-1/2 rounded-md border border-white/70 bg-white/90 shadow-sm" />
              <div className="absolute left-1/2 top-8 h-6 w-28 -translate-x-1/2 rounded-xl border border-white/70 bg-white/90 shadow-sm" />
              <div className={clsx('absolute left-4 top-10 sm:top-12 h-5 w-5 sm:h-6 sm:w-6 rounded-lg border shadow-sm', toneStyles.chair)} />
              <div className={clsx('absolute right-4 top-10 sm:top-12 h-5 w-5 sm:h-6 sm:w-6 rounded-lg border shadow-sm', toneStyles.chair)} />
            </div>
          </div>
        </div>

        {isMaintenance && desk.maintenanceMessage && isHovered && (
          <div className="absolute inset-0 bg-slate-900/95 text-white p-5 rounded-2xl flex items-center justify-center text-center z-20">
            <p className="text-sm">{desk.maintenanceMessage}</p>
          </div>
        )}

        {isReserved && !isMyReservation && reservedPerson && isHovered && (
          <div className="absolute inset-x-5 bottom-24 flex flex-col items-center justify-center text-center px-3 py-2 rounded-xl bg-white/90 border border-rose-200 text-rose-800 shadow-sm z-20">
            <p className="text-[10px] uppercase tracking-wider">Reserved by</p>
            <p className="font-semibold text-sm mt-1 flex items-center gap-1">
              <UserIcon className="h-4 w-4 text-rose-500" />
              {reservedPerson}
            </p>
          </div>
        )}

        <div className="w-full z-20 space-y-3">
          {isOpen && !isMaintenance && (
            <button
              type="button"
              onClick={() => onReserve(desk.deskId)}
              className={clsx(
                'w-full inline-flex items-center justify-center gap-2 py-2.5 text-white rounded-xl font-medium shadow-sm cursor-pointer transition-colors focus-ring',
                toneStyles.button
              )}
            >
              <CalendarDaysIcon className="h-5 w-5" />
              Reserve desk
            </button>
          )}

          {isMyReservation && desk.myReservationId && reservationDates.length > 0 && (
            <div className="space-y-3">
              <div className="text-sm font-semibold text-slate-600">Select a day</div>
            <select
              data-testid="reservation-day-select"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white/90 focus-ring"
              value={normalizedSelectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            >
                {reservationDates.map((date) => (
                  <option key={date} value={date}>
                    {date}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  type="button"
                  data-testid="cancel-day"
                  onClick={() => onCancelDay(desk.myReservationId!, normalizedSelectedDate)}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold focus-ring"
                >
                  <XMarkIcon className="h-4 w-4" />
                  Cancel day
                </button>
                <button
                  type="button"
                  data-testid="cancel-whole"
                  onClick={() => onCancelWhole(desk.myReservationId!)}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold focus-ring"
                >
                  <TrashIcon className="h-4 w-4" />
                  Cancel reservation
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
