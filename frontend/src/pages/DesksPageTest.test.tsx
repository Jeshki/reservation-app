import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeskStatus, type DeskListItemDto } from '../types';
import { api } from '../api';
import { DesksPage } from './DesksPage';

vi.mock('../api', () => {
  const getDesks = vi.fn<(from: string, to: string) => Promise<DeskListItemDto[]>>();
  const reserve = vi.fn();
  const cancelWhole = vi.fn();
  const cancelDay = vi.fn();
  return {
    api: {
      getDesks,
      reserve,
      cancelWhole,
      cancelDay,
    },
  };
});

const mockedApi = vi.mocked(api, true);

vi.mock('../components/DeskCard', () => {
  return {
    DeskCard: function DeskCard({
      desk,
      onSelect,
      onReserve,
      onCancelWhole,
      onCancelDay,
    }: {
      desk: DeskListItemDto;
      onSelect?: (deskId: number) => void;
      onReserve: (deskId: number) => void;
      onCancelWhole: (reservationId: number) => void;
      onCancelDay: (reservationId: number, date: string) => void;
    }) {
      const reservationId = desk.myReservationId ?? desk.deskId;
      return (
        <div data-testid={`desk-card-${desk.deskId}`} onClick={() => onSelect?.(desk.deskId)}>
          <span>Desk {desk.number}</span>
          <button data-testid={`reserve-${desk.deskId}`} onClick={() => onReserve(desk.deskId)}>
            Reserve stub
          </button>
          <button
            data-testid={`cancel-day-${desk.deskId}`}
            onClick={() => onCancelDay(reservationId, '2025-12-25')}
          >
            Cancel day stub
          </button>
          <button
            data-testid={`cancel-whole-${desk.deskId}`}
            onClick={() => onCancelWhole(reservationId)}
          >
            Cancel whole stub
          </button>
        </div>
      );
    },
  };
});

vi.mock('../components/DeskPlan', () => {
  return {
    DeskPlan: function DeskPlan() {
      return <div data-testid="desk-plan">Desk plan stub</div>;
    },
  };
});

const confirmSpy = vi.spyOn(window, 'confirm');
const alertSpy = vi.spyOn(window, 'alert');
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

beforeAll(() => {
  confirmSpy.mockReturnValue(true);
  alertSpy.mockImplementation(() => {});
});

beforeEach(() => {
  mockedApi.getDesks.mockClear();
  mockedApi.reserve.mockClear();
  mockedApi.cancelWhole.mockClear();
  mockedApi.cancelDay.mockClear();
  confirmSpy.mockReturnValue(true);
  alertSpy.mockClear();
  consoleErrorSpy.mockClear();
});

afterAll(() => {
  confirmSpy.mockRestore();
  alertSpy.mockRestore();
  consoleErrorSpy.mockRestore();
});

describe('DesksPage', () => {
  it('fetches desks and renders the mock DeskCard once data arrives', async () => {
    const desks: DeskListItemDto[] = [
      { deskId: 1, number: 3, status: DeskStatus.Open },
      { deskId: 2, number: 7, status: DeskStatus.Reserved, myReservationId: 5 },
    ];
    mockedApi.getDesks.mockResolvedValue(desks);

    render(<DesksPage />);

    await waitFor(() => {
      expect(screen.getByText('Desk 3')).toBeInTheDocument();
      expect(screen.getByText('Desk 7')).toBeInTheDocument();
    });
    expect(mockedApi.getDesks).toHaveBeenCalledTimes(1);
  });

  it('opens the reservation modal and calls reserve with selected dates', async () => {
    const desk: DeskListItemDto = { deskId: 3, number: 9, status: DeskStatus.Open };
    mockedApi.getDesks.mockResolvedValue([desk]);
    mockedApi.reserve.mockResolvedValue({});

    const user = userEvent.setup();
    render(<DesksPage />);

    await waitFor(() => screen.getByTestId('desk-card-3'));

    await user.click(screen.getByTestId('reserve-3'));

    const startInput = screen.getByLabelText('From', { selector: 'input#reserve-start' }) as HTMLInputElement;
    const endInput = screen.getByLabelText('To', { selector: 'input#reserve-end' }) as HTMLInputElement;
    const modalReserveButton = screen.getByRole('button', { name: /confirm reservation/i });

    await user.click(modalReserveButton);

    await waitFor(() => {
      expect(mockedApi.reserve).toHaveBeenCalledWith({
        deskId: desk.deskId,
        startDate: startInput.value,
        endDate: endInput.value,
      });
      expect(mockedApi.getDesks).toHaveBeenCalledTimes(2);
    });

    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: /reserve desk/i })).not.toBeInTheDocument()
    );
    expect(alertSpy).toHaveBeenCalledWith('Reservation successful!');
  }, 20000);

  it('calls cancelWhole and cancelDay handlers when DeskCard triggers them', async () => {
    const desk: DeskListItemDto = {
      deskId: 4,
      number: 12,
      status: DeskStatus.Reserved,
      myReservationId: 88,
    };
    mockedApi.getDesks.mockResolvedValue([desk]);

    const user = userEvent.setup();
    render(<DesksPage />);

    await waitFor(() => screen.getByTestId('desk-card-4'));

    await user.click(screen.getByTestId('cancel-day-4'));
    expect(mockedApi.cancelDay).toHaveBeenCalledWith(88, '2025-12-25');

    await user.click(screen.getByTestId('cancel-whole-4'));
    expect(mockedApi.cancelWhole).toHaveBeenCalledWith(88);
  });

  it('shows an alert when fetching desks fails', async () => {
    mockedApi.getDesks.mockRejectedValue(new Error('boom'));

    render(<DesksPage />);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Failed to load desk data.');
    });
    expect(mockedApi.getDesks).toHaveBeenCalledTimes(1);
  });

  it('validates that the end date is not before the start date', async () => {
    const desk: DeskListItemDto = { deskId: 5, number: 21, status: DeskStatus.Open };
    mockedApi.getDesks.mockResolvedValue([desk]);
    mockedApi.reserve.mockResolvedValue({});

    const user = userEvent.setup();
    render(<DesksPage />);

    await waitFor(() => screen.getByTestId('desk-card-5'));

    await user.click(screen.getByTestId('reserve-5'));

    const startInput = screen.getByLabelText('From', { selector: 'input#reserve-start' }) as HTMLInputElement;
    const endInput = screen.getByLabelText('To', { selector: 'input#reserve-end' }) as HTMLInputElement;

    fireEvent.change(startInput, { target: { value: '2025-12-10' } });
    fireEvent.change(endInput, { target: { value: '2025-12-08' } });

    fireEvent.click(screen.getByRole('button', { name: /confirm reservation/i }));

    expect(alertSpy).toHaveBeenCalledWith('The end date cannot be before the start date.');
    expect(mockedApi.reserve).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: /reserve desk/i })).toBeInTheDocument();
  }, 10000);

  it('does not call cancel handlers if the user declines confirmation', async () => {
    const desk: DeskListItemDto = {
      deskId: 6,
      number: 13,
      status: DeskStatus.Reserved,
      myReservationId: 50,
    };
    mockedApi.getDesks.mockResolvedValue([desk]);
    confirmSpy.mockReturnValue(false);

    const user = userEvent.setup();
    render(<DesksPage />);

    await waitFor(() => screen.getByTestId('desk-card-6'));

    await user.click(screen.getByTestId('cancel-day-6'));
    await user.click(screen.getByTestId('cancel-whole-6'));

    expect(mockedApi.cancelDay).not.toHaveBeenCalled();
    expect(mockedApi.cancelWhole).not.toHaveBeenCalled();
  });

  it('alerts on cancelWhole error', async () => {
    const desk: DeskListItemDto = {
      deskId: 7,
      number: 20,
      status: DeskStatus.Reserved,
      myReservationId: 70,
    };
    mockedApi.getDesks.mockResolvedValue([desk]);
    mockedApi.cancelWhole.mockRejectedValue(new Error('network'));

    const user = userEvent.setup();
    render(<DesksPage />);

    await waitFor(() => screen.getByTestId('desk-card-7'));

    await user.click(screen.getByTestId('cancel-whole-7'));

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Error'));
    expect(mockedApi.getDesks).toHaveBeenCalledTimes(1);
  });

  it('alerts on cancelDay error', async () => {
    const desk: DeskListItemDto = {
      deskId: 8,
      number: 22,
      status: DeskStatus.Reserved,
      myReservationId: 88,
    };
    mockedApi.getDesks.mockResolvedValue([desk]);
    mockedApi.cancelDay.mockRejectedValue(new Error('network'));

    const user = userEvent.setup();
    render(<DesksPage />);

    await waitFor(() => screen.getByTestId('desk-card-8'));

    await user.click(screen.getByTestId('cancel-day-8'));

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Error'));
    expect(mockedApi.getDesks).toHaveBeenCalledTimes(1);
  });
});
