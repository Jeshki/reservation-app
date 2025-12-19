import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

vi.mock('./pages/DesksPage', () => ({
  DesksPage: () => <div data-testid="desks-page">Desks Page</div>,
}));

vi.mock('./pages/ProfilePage', () => ({
  ProfilePage: () => <div data-testid="profile-page">Profile Page</div>,
}));

let initialEntries = ['/'];

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    BrowserRouter: ({ children }: { children: ReactNode }) => (
      <actual.MemoryRouter initialEntries={initialEntries}>{children}</actual.MemoryRouter>
    ),
  };
});

describe('App routing and navigation', () => {
  it('renders navbar and navigates between desks and profile', async () => {
    initialEntries = ['/'];
    const firstRender = render(<App />);

    expect(screen.getByRole('link', { name: /DeskBooking/i })).toBeInTheDocument();
    expect(screen.getByTestId('desks-page')).toBeInTheDocument();

    const profileLink = screen.getByRole('link', { name: /My Profile/i });
    expect(profileLink.className).toContain('text-slate-600');
    expect(profileLink.className).not.toContain('bg-emerald-600');

    // Re-render with profile route pre-selected
    firstRender.unmount();
    initialEntries = ['/profile'];
    render(<App />);
    expect(screen.getByTestId('profile-page')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /My Profile/i }).className).toContain('bg-emerald-600');
  }, 15000);
});
