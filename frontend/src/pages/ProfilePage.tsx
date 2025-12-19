import { useEffect, useState, type ReactNode } from 'react';
import dayjs from 'dayjs';
import { ArchiveBoxIcon, ClockIcon, MapPinIcon, UserCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { api } from '../api';
import type { ProfileDto, ReservationDto } from '../types';

type ReservationVariant = 'active' | 'history' | 'cancelled';

export function ProfilePage() {
  const [profile, setProfile] = useState<ProfileDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch the current user's profile once on mount.
    api.getProfile()
      .then(setProfile)
      .catch(() => alert('Failed to fetch profile'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-10 text-center text-slate-500">Loading profile...</div>;
  if (!profile) return <div className="p-10 text-center text-rose-500">Error.</div>;

  return (
    <div className="container mx-auto px-4 sm:px-6 py-5 sm:py-6 max-w-6xl">
      <div className="relative overflow-hidden rounded-[2.5rem] border border-white/60 bg-gradient-to-br from-white via-white/95 to-emerald-50/70 p-5 sm:p-8 shadow-xl">
        <div className="absolute -left-20 -bottom-16 h-56 w-56 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-sky-100/60 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <UserCircleIcon className="h-8 w-8" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.35em] text-slate-500">Profile</div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-slate-900">My Profile</h1>
              <p className="text-base sm:text-xl text-slate-600">{profile.firstName} {profile.lastName}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-md">
            <SummaryCard label="Active" value={profile.currentReservations.length} tone="emerald" />
            <SummaryCard label="History" value={profile.pastReservations.length} tone="slate" />
            <SummaryCard label="Cancelled" value={profile.cancelledReservations.length} tone="rose" />
          </div>
        </div>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        <SectionCard
          title="Active reservations"
          icon={<ClockIcon className="h-5 w-5" />}
          tone="emerald"
        >
          <ReservationList
            list={profile.currentReservations}
            variant="active"
            emptyMessage="No active reservations."
          />
        </SectionCard>

        <SectionCard
          title="History"
          icon={<ArchiveBoxIcon className="h-5 w-5" />}
          tone="slate"
        >
          <ReservationList
            list={profile.pastReservations}
            variant="history"
            emptyMessage="History is empty."
          />
        </SectionCard>

        <SectionCard
          title="Cancellations"
          icon={<XCircleIcon className="h-5 w-5" />}
          tone="rose"
        >
          <ReservationList
            list={profile.cancelledReservations}
            variant="cancelled"
            emptyMessage="No cancelled reservations."
          />
        </SectionCard>
      </div>
    </div>
  );
}

// Shared renderer for active, historical, and cancelled reservations.
function ReservationList({
  list,
  variant,
  emptyMessage,
}: {
  list: ReservationDto[];
  variant: ReservationVariant;
  emptyMessage: string;
}) {
  if (list.length === 0) return <p className="text-slate-400 italic">{emptyMessage}</p>;

  const badgeMap: Record<ReservationVariant, { label: string; className: string; iconClass: string }> = {
    active: {
      label: 'Active',
      className: 'bg-emerald-100 text-emerald-700',
      iconClass: 'bg-emerald-100 text-emerald-700',
    },
    history: {
      label: 'Completed',
      className: 'bg-slate-200 text-slate-700',
      iconClass: 'bg-slate-200 text-slate-600',
    },
    cancelled: {
      label: 'Cancelled',
      className: 'bg-rose-100 text-rose-700',
      iconClass: 'bg-rose-100 text-rose-700',
    },
  };

  const cardStyles: Record<ReservationVariant, string> = {
    active: 'bg-white border-emerald-100 shadow-sm',
    history: 'bg-white/80 border-slate-200',
    cancelled: 'bg-white/80 border-rose-100',
  };

  const badge = badgeMap[variant];

  return (
    <div className="flex flex-col gap-3">
      {list.map(r => (
        <div
          key={r.reservationId}
          className={`p-4 rounded-2xl border ${cardStyles[variant]}`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${badge.iconClass}`}>
                <MapPinIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-lg text-slate-800">Desk #{r.deskNumber}</p>
                <p className="text-sm text-slate-500">{formatDateRange(r.startDate, r.endDate)}</p>
              </div>
            </div>
            <div className={`text-xs px-3 py-1 rounded-full font-semibold self-start sm:self-auto ${badge.className}`}>
              {badge.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'emerald' | 'slate' | 'rose';
}) {
  const styles: Record<typeof tone, string> = {
    emerald: 'border-emerald-100 bg-white text-emerald-700',
    slate: 'border-slate-200 bg-white text-slate-700',
    rose: 'border-rose-100 bg-white text-rose-700',
  };

  return (
    <div className={`rounded-2xl border p-3 text-center shadow-sm ${styles[tone]}`}>
      <div className="text-xs uppercase tracking-[0.3em] text-slate-400">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

function SectionCard({
  title,
  icon,
  tone,
  children,
}: {
  title: string;
  icon: ReactNode;
  tone: 'emerald' | 'slate' | 'rose';
  children: ReactNode;
}) {
  const tones: Record<typeof tone, string> = {
    emerald: 'bg-emerald-100 text-emerald-700',
    slate: 'bg-slate-200 text-slate-700',
    rose: 'bg-rose-100 text-rose-700',
  };

  return (
    <section className="rounded-3xl border border-white/60 bg-white/90 p-4 sm:p-5 shadow-lg">
      <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-3">
        <span className={`h-9 w-9 rounded-2xl flex items-center justify-center ${tones[tone]}`}>
          {icon}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function formatDateRange(start: string, end: string) {
  const startDate = formatDate(start);
  const endDate = formatDate(end);
  return `${startDate} - ${endDate}`;
}

function formatDate(value: string) {
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('MMM D, YYYY') : value;
}

