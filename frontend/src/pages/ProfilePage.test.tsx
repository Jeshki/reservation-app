import { beforeEach, describe, expect, it, vi, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ProfilePage } from './ProfilePage';
import { api } from '../api';

vi.mock('../api', () => {
  const getProfile = vi.fn();
  return {
    api: {
      getProfile,
    },
  };
});

const mockedApi = vi.mocked(api, true);
const alertSpy = vi.spyOn(window, 'alert');

beforeEach(() => {
  mockedApi.getProfile.mockReset();
  alertSpy.mockImplementation(() => {});
});

afterAll(() => {
  alertSpy.mockRestore();
});

describe('ProfilePage', () => {
  it('shows loader then renders profile data', async () => {
    const profile = {
      firstName: 'John',
      lastName: 'Smith',
      currentReservations: [
        { reservationId: 1, deskNumber: 5, startDate: '2025-01-02', endDate: '2025-01-03' },
      ],
      pastReservations: [
        { reservationId: 2, deskNumber: 7, startDate: '2024-12-01', endDate: '2024-12-02' },
      ],
    };
    mockedApi.getProfile.mockResolvedValue(profile);

    render(<ProfilePage />);

    expect(screen.getByText(/Loading/)).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText(/John Smith/)).toBeInTheDocument());
    expect(screen.getByRole('heading', { name: /Active reservations/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /History/ })).toBeInTheDocument();
    expect(screen.getByText(/Desk #5/)).toBeInTheDocument();
    expect(screen.getByText(/Desk #7/)).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  }, 15000);

  it('shows an error alert and message when profile load fails', async () => {
    mockedApi.getProfile.mockRejectedValue(new Error('boom'));

    render(<ProfilePage />);

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Failed to fetch profile'));
    expect(screen.getByText(/Error\./)).toBeInTheDocument();
  });

  it('renders empty state messages when there are no reservations', async () => {
    mockedApi.getProfile.mockResolvedValue({
      firstName: 'Alice',
      lastName: 'Adams',
      currentReservations: [],
      pastReservations: [],
    });

    render(<ProfilePage />);

    await waitFor(() => expect(screen.getByText(/Alice/)).toBeInTheDocument());

    expect(screen.getByRole('heading', { name: /Active reservations/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^History$/ })).toBeInTheDocument();
    expect(screen.getByText('No active reservations.')).toBeInTheDocument();
    expect(screen.getByText(/History is empty\./i)).toBeInTheDocument();
  });
});











