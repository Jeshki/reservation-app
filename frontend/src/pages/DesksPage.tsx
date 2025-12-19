import { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import dayjs from 'dayjs';
import {
  CalendarDaysIcon,
  CheckCircleIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  Squares2X2Icon,
  SunIcon,
  UserCircleIcon,
  WrenchScrewdriverIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { api } from '../api';
import { DeskCard } from '../components/DeskCard';
import { DatePicker } from '../components/DatePicker';
import { DeskPlan } from '../components/DeskPlan';
import { generateDates } from '../components/deskCardHelpers';
import { getDeskZone, getDeskZoneLabel, isWindowDesk } from '../deskZones';
import type { DeskListItemDto } from '../types';
import { DeskStatus } from '../types';

type StatusName = 'Open' | 'Reserved' | 'Maintenance';

const resolveStatusName = (status: DeskStatus | string): StatusName => {
  if (status === DeskStatus.Reserved || status === 'Reserved') return 'Reserved';
  if (status === DeskStatus.Maintenance || status === 'Maintenance') return 'Maintenance';
  return 'Open';
};

export function DesksPage() {
  const [filterDate, setFilterDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [filterDateTo, setFilterDateTo] = useState(dayjs().format('YYYY-MM-DD'));
  const [desks, setDesks] = useState<DeskListItemDto[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedDeskId, setSelectedDeskId] = useState<number | null>(null);
  const [reserveDeskId, setReserveDeskId] = useState<number | null>(null);
  const [reserveStart, setReserveStart] = useState(filterDate);
  const [reserveEnd, setReserveEnd] = useState(filterDate);
  const [quickReserveId, setQuickReserveId] = useState<number | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [onlyMine, setOnlyMine] = useState(false);
  const [onlyWindow, setOnlyWindow] = useState(false);
  const [highContrast, setHighContrast] = useState(false);

  // Pull availability for the active date filter range.
  const fetchDesks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getDesks(filterDate, filterDateTo);
      setDesks(data);
    } catch (e) {
      console.error(e);
      alert('Failed to load desk data.');
    } finally {
      setLoading(false);
    }
  }, [filterDate, filterDateTo]);

  useEffect(() => {
    fetchDesks();
  }, [fetchDesks]);

  useEffect(() => {
    if (!reserveDeskId) {
      setReserveStart(filterDate);
      setReserveEnd(filterDate);
    }
  }, [filterDate, reserveDeskId]);

  const filteredDesks = useMemo(() => {
    const normalizedSearch = searchTerm.trim();
    return desks.filter((desk) => {
      const statusName = resolveStatusName(desk.status);
      if (normalizedSearch && !desk.number.toString().includes(normalizedSearch)) return false;
      if (onlyOpen && statusName !== 'Open') return false;
      if (onlyMine && desk.myReservationId == null) return false;
      if (onlyWindow && !isWindowDesk(desk.number)) return false;
      return true;
    });
  }, [desks, onlyMine, onlyOpen, onlyWindow, searchTerm]);

  useEffect(() => {
    if (selectedDeskId && !filteredDesks.some((desk) => desk.deskId === selectedDeskId)) {
      setSelectedDeskId(null);
    }
  }, [filteredDesks, selectedDeskId]);

  const selectedDesk = useMemo(
    () => desks.find((desk) => desk.deskId === selectedDeskId) ?? null,
    [desks, selectedDeskId]
  );

  const openReserveModal = (deskId: number) => {
    const target = desks.find((desk) => desk.deskId === deskId);
    if (!target) return;
    if (resolveStatusName(target.status) !== 'Open') return;
    setReserveDeskId(deskId);
    setReserveStart(filterDate);
    setReserveEnd(filterDate);
  };

  const handleReserve = async () => {
    if (reserveDeskId === null) return;
    if (dayjs(reserveEnd).isBefore(dayjs(reserveStart))) {
      alert('The end date cannot be before the start date.');
      return;
    }
    try {
      await api.reserve({
        deskId: reserveDeskId,
        startDate: reserveStart,
        endDate: reserveEnd,
      });
      alert('Reservation successful!');
      setReserveDeskId(null);
      setSelectedDeskId(null);
      fetchDesks();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to reserve the desk.';
      alert(message);
    }
  };

  const handleQuickReserve = async (deskId: number) => {
    const target = desks.find((desk) => desk.deskId === deskId);
    if (!target || resolveStatusName(target.status) !== 'Open') return;
    setQuickReserveId(deskId);
    try {
      await api.reserve({
        deskId,
        startDate: filterDate,
        endDate: filterDate,
      });
      alert('Reservation successful!');
      setSelectedDeskId(null);
      fetchDesks();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to reserve the desk.';
      alert(message);
    } finally {
      setQuickReserveId(null);
    }
  };

  const handleCancelWhole = async (id: number) => {
    if (!confirm('Are you sure you want to cancel the entire reservation?')) return;
    try {
      await api.cancelWhole(id);
      fetchDesks();
    } catch {
      alert('Error');
    }
  };

  const handleCancelDay = async (id: number, dateStr: string) => {
    if (!confirm(`Are you sure you want to cancel the reservation for ${dateStr}?`)) return;
    try {
      await api.cancelDay(id, dateStr);
      fetchDesks();
    } catch {
      alert('Error');
    }
  };

  const applyQuickRange = (days: number) => {
    const start = filterDate;
    const end = dayjs(filterDate).add(days, 'day').format('YYYY-MM-DD');
    setReserveStart(start);
    setReserveEnd(end);
  };

  const applyFilterRange = () => {
    setReserveStart(filterDate);
    setReserveEnd(filterDateTo);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setOnlyOpen(false);
    setOnlyMine(false);
    setOnlyWindow(false);
  };

  const skeletonCards = Array.from({ length: 8 }, (_, index) => (
    <div
      key={`skeleton-${index}`}
      className="h-[18rem] rounded-2xl border border-slate-200 bg-white/80 animate-pulse"
    />
  ));

  const isFiltering = searchTerm.trim().length > 0 || onlyOpen || onlyMine || onlyWindow;

  return (
    <div className={clsx('container mx-auto px-4 sm:px-6 py-5 sm:py-6', highContrast && 'high-contrast')}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between mb-6 sm:mb-10">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-3 py-1 text-[10px] sm:text-xs font-semibold text-slate-600 shadow-sm">
            <Squares2X2Icon className="h-4 w-4 text-slate-500" />
            Office layout
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-slate-900">Choose your desk</h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-xl">
            Pick an available desk and reserve it for a specific day or range. Hover a desk to see details.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-2xl border border-white/60 bg-white/90 p-4 shadow-lg">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <CalendarDaysIcon className="h-4 w-4" />
            Dates
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-600 min-w-[3rem]">From</label>
              <DatePicker
                id="filter-from"
                ariaLabel="Filter start date"
                value={filterDate}
                onChange={setFilterDate}
                className="w-full sm:w-auto px-3 py-2 rounded-lg bg-white/90 focus-ring"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-600 min-w-[1.5rem]">To</label>
              <DatePicker
                id="filter-to"
                ariaLabel="Filter end date"
                value={filterDateTo}
                onChange={setFilterDateTo}
                className="w-full sm:w-auto px-3 py-2 rounded-lg bg-white/90 focus-ring"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-white/60 bg-white/90 p-4 shadow-lg mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative w-full sm:w-auto">
              <MagnifyingGlassIcon className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search desk number"
                className="w-full sm:w-52 rounded-xl border border-slate-200 bg-white px-9 py-2 text-sm text-slate-700 focus-ring"
              />
            </div>
            <button
              type="button"
              onClick={() => setOnlyOpen((value) => !value)}
              aria-pressed={onlyOpen}
              className={clsx(
                'inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors focus-ring w-full sm:w-auto',
                onlyOpen
                  ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              )}
            >
              <CheckCircleIcon className="h-4 w-4" />
              Only open
            </button>
            <button
              type="button"
              onClick={() => setOnlyMine((value) => !value)}
              aria-pressed={onlyMine}
              className={clsx(
                'inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors focus-ring w-full sm:w-auto',
                onlyMine
                  ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              )}
            >
              <UserCircleIcon className="h-4 w-4" />
              Only mine
            </button>
            <button
              type="button"
              onClick={() => setOnlyWindow((value) => !value)}
              aria-pressed={onlyWindow}
              className={clsx(
                'inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors focus-ring w-full sm:w-auto',
                onlyWindow
                  ? 'border-amber-200 bg-amber-100 text-amber-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              )}
            >
              <SunIcon className="h-4 w-4" />
              Near window (Zone A)
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              {filteredDesks.length} desks
            </span>
            {isFiltering && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200 focus-ring"
              >
                <XMarkIcon className="h-4 w-4" />
                Clear filters
              </button>
            )}
            <button
              type="button"
              onClick={() => setHighContrast((value) => !value)}
              aria-pressed={highContrast}
              className={clsx(
                'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition-colors focus-ring',
                highContrast
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              )}
            >
              High contrast
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 text-emerald-700 px-3 py-1 text-xs font-semibold">
          <CheckCircleIcon className="h-4 w-4" />
          Available
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-rose-100 text-rose-700 px-3 py-1 text-xs font-semibold">
          <LockClosedIcon className="h-4 w-4" />
          Reserved
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-slate-200 text-slate-700 px-3 py-1 text-xs font-semibold">
          <WrenchScrewdriverIcon className="h-4 w-4" />
          Maintenance
        </span>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-8">
          {loading ? (
            <div className="h-72 rounded-3xl border border-slate-200 bg-white/80 animate-pulse" />
          ) : (
            filteredDesks.length > 0 && (
              <div className="animate-fade-in">
                <DeskPlan
                  desks={filteredDesks}
                  selectedDeskId={selectedDeskId}
                  onSelectDesk={setSelectedDeskId}
                  onActivateDesk={openReserveModal}
                  highContrast={highContrast}
                />
              </div>
            )
          )}

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {skeletonCards}
            </div>
          ) : filteredDesks.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white/80 p-10 text-center">
              <p className="text-slate-500">No desks match the filters.</p>
              {isFiltering && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 focus-ring"
                >
                  <XMarkIcon className="h-4 w-4" />
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredDesks.map((desk, index) => (
                <div
                  key={desk.deskId}
                  className="animate-fade-up"
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  <DeskCard
                    desk={desk}
                    currentDate={filterDate}
                    isSelected={desk.deskId === selectedDeskId}
                    onSelect={(id) => setSelectedDeskId(id)}
                    onReserve={(id) => openReserveModal(id)}
                    onCancelWhole={handleCancelWhole}
                    onCancelDay={handleCancelDay}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-24 h-fit">
          <DeskSidePanel
            desk={selectedDesk}
            filterDate={filterDate}
            quickReserveId={quickReserveId}
            onReserve={openReserveModal}
            onQuickReserve={handleQuickReserve}
            onCancelDay={handleCancelDay}
            onCancelWhole={handleCancelWhole}
          />
        </div>
      </div>

      {reserveDeskId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-2xl w-full max-w-lg animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold mb-1 text-slate-800">Reserve desk</h2>
                <p className="text-slate-500 text-sm">Select reservation period.</p>
              </div>
              <button
                type="button"
                onClick={() => setReserveDeskId(null)}
                className="h-9 w-9 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 focus-ring"
                aria-label="Close reservation modal"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-sm text-emerald-700">
                Selected: {reserveStart} to {reserveEnd}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => applyQuickRange(0)}
                  className="rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-200 focus-ring"
                >
                  1 day
                </button>
                <button
                  type="button"
                  onClick={() => applyQuickRange(6)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 focus-ring"
                >
                  1 week
                </button>
                <button
                  type="button"
                  onClick={applyFilterRange}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 focus-ring"
                >
                  Use filter range
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="reserve-start" className="block text-sm font-medium text-slate-700 mb-1">
                    From
                  </label>
                  <DatePicker
                    id="reserve-start"
                    value={reserveStart}
                    onChange={setReserveStart}
                    className="w-full p-2.5 rounded-lg focus-ring"
                  />
                </div>
                <div>
                  <label htmlFor="reserve-end" className="block text-sm font-medium text-slate-700 mb-1">
                    To
                  </label>
                  <DatePicker
                    id="reserve-end"
                    value={reserveEnd}
                    onChange={setReserveEnd}
                    className="w-full p-2.5 rounded-lg focus-ring"
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 flex gap-3 justify-end">
              <button
                onClick={() => setReserveDeskId(null)}
                className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium cursor-pointer transition-colors focus-ring"
              >
                Cancel
              </button>
              <button
                onClick={handleReserve}
                className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-md cursor-pointer font-medium transition-colors focus-ring"
              >
                Confirm reservation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type DeskSidePanelProps = {
  desk: DeskListItemDto | null;
  filterDate: string;
  quickReserveId: number | null;
  onReserve: (deskId: number) => void;
  onQuickReserve: (deskId: number) => void;
  onCancelWhole: (reservationId: number) => void;
  onCancelDay: (reservationId: number, date: string) => void;
};

function DeskSidePanel({
  desk,
  filterDate,
  quickReserveId,
  onReserve,
  onQuickReserve,
  onCancelWhole,
  onCancelDay,
}: DeskSidePanelProps) {
  const reservationDates = useMemo(
    () => (desk ? generateDates(desk.myReservationStart, desk.myReservationEnd) : []),
    [desk]
  );
  const [selectedDate, setSelectedDate] = useState(() => reservationDates[0] ?? filterDate);

  useEffect(() => {
    setSelectedDate(reservationDates[0] ?? filterDate);
  }, [filterDate, reservationDates]);

  if (!desk) {
    return (
      <aside className="rounded-3xl border border-white/60 bg-white/90 p-4 sm:p-6 shadow-lg text-center">
        <p className="text-sm text-slate-500">Select a desk on the plan to see details.</p>
      </aside>
    );
  }

  const statusName = resolveStatusName(desk.status);
  const isOpen = statusName === 'Open';
  const isReserved = statusName === 'Reserved';
  const isMaintenance = statusName === 'Maintenance';
  const isMyReservation = isReserved && desk.myReservationId != null;
  const reservedPerson =
    desk.reservedByFirstName || desk.reservedByLastName
      ? `${desk.reservedByFirstName ?? ''} ${desk.reservedByLastName ?? ''}`.trim()
      : null;
  const zoneLabel = getDeskZoneLabel(getDeskZone(desk.number));

  const normalizedSelectedDate = reservationDates.includes(selectedDate)
    ? selectedDate
    : (reservationDates[0] ?? filterDate);

  const quickReserveDisabled = quickReserveId === desk.deskId;

  return (
    <aside className="rounded-3xl border border-white/60 bg-white/90 p-4 sm:p-6 shadow-lg space-y-4">
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-semibold">
          {desk.number}
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Desk</div>
          <h3 className="text-xl font-semibold text-slate-900">Desk #{desk.number}</h3>
          <p className="text-sm text-slate-500">{zoneLabel}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Status</span>
          <span className={clsx(
            'px-2 py-1 rounded-full text-xs font-semibold',
            isOpen && 'bg-emerald-100 text-emerald-700',
            isReserved && 'bg-rose-100 text-rose-700',
            isMaintenance && 'bg-slate-200 text-slate-700'
          )}>
            {statusName}
          </span>
        </div>
        {isReserved && reservedPerson && (
          <div className="text-sm text-slate-600">Reserved by {reservedPerson}</div>
        )}
        {desk.myReservationStart && desk.myReservationEnd && (
          <div className="text-xs text-slate-500">
            Period: {desk.myReservationStart} to {desk.myReservationEnd}
          </div>
        )}
        {isMaintenance && desk.maintenanceMessage && (
          <div className="text-sm text-slate-600">{desk.maintenanceMessage}</div>
        )}
      </div>

      {isOpen && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => onReserve(desk.deskId)}
            className="w-full rounded-xl bg-emerald-600 px-4 py-2 text-white font-semibold shadow-sm hover:bg-emerald-700 focus-ring"
          >
            Reserve desk
          </button>
          <button
            type="button"
            onClick={() => onQuickReserve(desk.deskId)}
            disabled={quickReserveDisabled}
            className={clsx(
              'w-full rounded-xl border px-4 py-2 text-sm font-semibold focus-ring',
              quickReserveDisabled
                ? 'border-slate-200 text-slate-400 bg-slate-50'
                : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
            )}
          >
            {quickReserveDisabled ? 'Reserving...' : `Quick reserve for ${filterDate}`}
          </button>
        </div>
      )}

      {isMyReservation && desk.myReservationId && reservationDates.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm font-semibold text-slate-600">Manage reservation</div>
          <select
            data-testid="reservation-day-select-panel"
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
              onClick={() => onCancelDay(desk.myReservationId!, normalizedSelectedDate)}
              className="flex-1 rounded-xl bg-amber-500 py-2 text-xs font-semibold text-white hover:bg-amber-600 focus-ring"
            >
              Cancel day
            </button>
            <button
              type="button"
              onClick={() => onCancelWhole(desk.myReservationId!)}
              className="flex-1 rounded-xl bg-rose-600 py-2 text-xs font-semibold text-white hover:bg-rose-700 focus-ring"
            >
              Cancel reservation
            </button>
          </div>
        </div>
      )}

      {!isOpen && !isMyReservation && (
        <div className="text-xs text-slate-400">
          {isReserved ? 'This desk is reserved.' : 'This desk is under maintenance.'}
        </div>
      )}
    </aside>
  );
}
