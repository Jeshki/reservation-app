// src/App.tsx
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Squares2X2Icon, UserCircleIcon } from '@heroicons/react/24/outline';
import { DesksPage } from './pages/DesksPage';
import { ProfilePage } from './pages/ProfilePage';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <div className="relative min-h-screen">
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
          <div className="absolute -top-28 -right-16 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl" />
          <div className="absolute top-24 -left-20 h-80 w-80 rounded-full bg-emerald-200/40 blur-3xl" />
          <div className="absolute bottom-0 right-1/3 h-64 w-64 rounded-full bg-sky-200/40 blur-3xl" />
        </div>
        <Navbar />
        <main className="relative pb-16">
          <Routes>
            <Route path="/" element={<DesksPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

function Navbar() {
  const location = useLocation();
  // Highlight the active route in the navigation.
  const isActive = (path: string) => location.pathname === path
    ? "bg-emerald-600 text-white shadow-sm"
    : "text-slate-600 hover:text-slate-900 hover:bg-emerald-50";

  return (
    <nav className="sticky top-0 z-40 mb-8 border-b border-white/60 bg-white/80 backdrop-blur-lg shadow-sm">
      <div className="container mx-auto px-6 h-16 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2 text-xl font-semibold text-slate-900 tracking-tight focus-ring rounded-full px-1">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
            <Squares2X2Icon className="h-5 w-5" />
          </span>
          Desk<span className="text-emerald-600">Booking</span>
        </Link>
        <div className="flex gap-2">
          <Link to="/" className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors focus-ring ${isActive('/')}`}>
            <Squares2X2Icon className="h-4 w-4" />
            Desks
          </Link>
          <Link to="/profile" className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors focus-ring ${isActive('/profile')}`}>
            <UserCircleIcon className="h-4 w-4" />
            My Profile
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default App;
