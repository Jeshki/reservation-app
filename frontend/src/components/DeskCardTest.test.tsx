import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeskCard } from './DeskCard';
import { generateDates } from './deskCardHelpers';
import { DeskStatus, type DeskListItemDto } from '../types';
import { createElement } from 'react';

const today = '2025-12-17';

const baseDesk: DeskListItemDto = {
  deskId: 101,
  number: 42,
  status: DeskStatus.Open,
};

const renderDeskCard = (overrides: Partial<DeskListItemDto> = {}) => {
  const desk: DeskListItemDto = { ...baseDesk, ...overrides };
  const onSelect = vi.fn();
  const onReserve = vi.fn();
  const onCancelWhole = vi.fn();
  const onCancelDay = vi.fn();

  // Use createElement to avoid JSX parsing issues in TS tooling that might miss the TSX config.
  render(
    createElement(DeskCard, {
      desk,
      currentDate: today,
      isSelected: false,
      onSelect,
      onReserve,
      onCancelWhole,
      onCancelDay,
    })
  );

  return { desk, onSelect, onReserve, onCancelWhole, onCancelDay };
};

describe('DeskCard', () => {
  it('allows reserving an open desk', async () => {
    const { desk, onReserve } = renderDeskCard();

    const reserveButton = screen.getByRole('button', { name: /reserve desk/i });
    fireEvent.click(reserveButton);

    expect(onReserve).toHaveBeenCalledWith(desk.deskId);
  }, 10000);

  it('shows reservation details for other users', () => {
    const { desk } = renderDeskCard({
      status: DeskStatus.Reserved,
      reservedByFirstName: 'Jane',
      reservedByLastName: 'Doe',
    });

    const card = screen.getByTestId(`desk-card-${desk.deskId}`);
    expect(screen.queryByText('Reserved by')).not.toBeInTheDocument();
    fireEvent.mouseEnter(card);
    expect(screen.getByText('Reserved by')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });

  it('shows maintenance message', () => {
    const { desk } = renderDeskCard({
      status: DeskStatus.Maintenance,
      maintenanceMessage: 'Broken chair',
    });

    const card = screen.getByTestId(`desk-card-${desk.deskId}`);
    expect(screen.queryByText('Broken chair')).not.toBeInTheDocument();
    fireEvent.mouseEnter(card);
    expect(screen.getByText(/Maintenance/)).toBeInTheDocument();
    expect(screen.getByText('Broken chair')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reserve desk/i })).not.toBeInTheDocument();
  });

  it('renders controls for my reservation and fires cancel handlers', async () => {
    const { onCancelWhole, onCancelDay } = renderDeskCard({
      status: DeskStatus.Reserved,
      myReservationId: 99,
      myReservationStart: '2025-12-10',
      myReservationEnd: '2025-12-12',
    });

    const user = userEvent.setup();
    const select = screen.getByTestId('reservation-day-select');
    expect(select).toHaveValue('2025-12-10');

    await user.selectOptions(select, '2025-12-11');
    expect((select as HTMLSelectElement).value).toBe('2025-12-11');

    const cancelDayButton = screen.getByTestId('cancel-day');
    await user.click(cancelDayButton);
    expect(onCancelDay).toHaveBeenCalledWith(99, '2025-12-11');

    const cancelWholeButton = screen.getByTestId('cancel-whole');
    await user.click(cancelWholeButton);
    expect(onCancelWhole).toHaveBeenCalledWith(99);
  }, 10000);

  it('hides reservation actions when another user has reserved the desk', () => {
    renderDeskCard({
      status: DeskStatus.Reserved,
      reservedByFirstName: 'Alice',
    });

    expect(screen.queryByRole('button', { name: /reserve desk/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId('reservation-day-select')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cancel-day')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cancel-whole')).not.toBeInTheDocument();
  });
});

describe('generateDates', () => {
  it('returns an inclusive list of dates', () => {
    expect(generateDates('2025-12-01', '2025-12-03')).toEqual([
      '2025-12-01',
      '2025-12-02',
      '2025-12-03',
    ]);
  });

  it('returns an empty array when either date is missing', () => {
    expect(generateDates(undefined, '2025-12-03')).toEqual([]);
    expect(generateDates('2025-12-01')).toEqual([]);
  });

  it('returns a single date when start and end match', () => {
    expect(generateDates('2025-12-05', '2025-12-05')).toEqual(['2025-12-05']);
  });

  it('returns an empty array when dates are invalid or reversed', () => {
    expect(generateDates('not-a-date', '2025-12-05')).toEqual([]);
    expect(generateDates('2025-12-10', '2025-12-05')).toEqual([]);
  });
});
