import { useEffect, useState } from 'react';
import { ArchiveBoxIcon, ClockIcon, MapPinIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { api } from '../api';
import type { ProfileDto, ReservationDto } from '../types';

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

  if (loading) return <div className="p-10 text-center text-slate-500">Loading...</div>;
  if (!profile) return <div className="p-10 text-center text-rose-500">Error.</div>;

  return (
    <div className="container mx-auto px-6 py-6 max-w-5xl">
      <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/90 p-8 shadow-lg mb-10">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-emerald-100/60 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
            <UserCircleIcon className="h-7 w-7" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Profile</div>
            <h1 className="text-3xl font-semibold text-slate-900">My Profile</h1>
            <p className="text-xl text-slate-600">{profile.firstName} {profile.lastName}</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Current reservations */}
        <div>
          <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-3">
            <span className="h-9 w-9 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <ClockIcon className="h-5 w-5" />
            </span>
            Active reservations
          </h2>
          <ReservationList list={profile.currentReservations} emptyMessage="No active reservations." />
        </div>

        {/* History */}
        <div>
          <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-3">
            <span className="h-9 w-9 rounded-2xl bg-slate-200 text-slate-700 flex items-center justify-center">
              <ArchiveBoxIcon className="h-5 w-5" />
            </span>
            History
          </h2>
          <ReservationList list={profile.pastReservations} isHistory emptyMessage="History is empty." />
        </div>
      </div>
    </div>
  );
}

// Shared renderer for active and historical reservations.
function ReservationList({ list, isHistory, emptyMessage }: { list: ReservationDto[], isHistory?: boolean, emptyMessage: string }) {
  if (list.length === 0) return <p className="text-slate-400 italic">{emptyMessage}</p>;

  return (
    <div className="flex flex-col gap-3">
      {list.map(r => (
        <div
          key={r.reservationId}
          className={`p-4 rounded-2xl border ${isHistory ? 'bg-white/80 border-slate-200' : 'bg-white border-emerald-100 shadow-sm'}`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${isHistory ? 'bg-slate-200 text-slate-600' : 'bg-emerald-100 text-emerald-700'}`}>
                <MapPinIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-lg text-slate-800">Desk #{r.deskNumber}</p>
                <p className="text-sm text-slate-500">{r.startDate} - {r.endDate}</p>
              </div>
            </div>
            {!isHistory && (
              <div className="text-xs px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full font-semibold">Active</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

