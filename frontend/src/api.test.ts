import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './api';

const fetchMock = vi.spyOn(globalThis, 'fetch');

beforeEach(() => {
  fetchMock.mockReset();
});

afterAll(() => {
  fetchMock.mockRestore();
});

describe('api.getProfile', () => {
  it('fetches profile data', async () => {
    const profile = { firstName: 'John', lastName: 'Smith', currentReservations: [], pastReservations: [] };
    fetchMock.mockResolvedValue(new Response(JSON.stringify(profile), { status: 200 }));

    const result = await api.getProfile();

    expect(fetchMock).toHaveBeenCalledWith('/api/Profile/1');
    expect(result).toEqual(profile);
  });

  it('throws when response is not ok', async () => {
    fetchMock.mockResolvedValue(new Response('nope', { status: 500 }));

    await expect(api.getProfile()).rejects.toThrow('Failed to fetch profile');
  });
});

describe('api.getDesks', () => {
  it('fetches desks with query params', async () => {
    const desks = [{ deskId: 1, number: 2, status: 0 }];
    fetchMock.mockResolvedValue(new Response(JSON.stringify(desks), { status: 200 }));

    const result = await api.getDesks('2025-01-01', '2025-01-02');

    expect(fetchMock).toHaveBeenCalledWith('/api/DeskBooking/availability?startDate=2025-01-01&endDate=2025-01-02');
    expect(result).toEqual(desks);
  });

  it('throws when response is not ok', async () => {
    fetchMock.mockResolvedValue(new Response('nope', { status: 400 }));

    await expect(api.getDesks('2025-01-01', '2025-01-02')).rejects.toThrow(/Failed to fetch/);
  });
});

describe('api.reserve', () => {
  it('posts reservation with userId and returns payload', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    const payload = { deskId: 5, startDate: '2025-01-02', endDate: '2025-01-03' };
    const result = await api.reserve(payload);

    const [, options] = fetchMock.mock.calls[0];
    expect(options?.method).toBe('POST');
    expect(options?.headers).toMatchObject({ 'Content-Type': 'application/json' });
    const body = JSON.parse(options?.body as string);
    expect(body).toMatchObject({ ...payload, userId: 1 });
    expect(result).toEqual({ ok: true });
  });

  it('throws with server text message when not ok', async () => {
    fetchMock.mockResolvedValue(new Response('fail reason', { status: 400 }));

    await expect(
      api.reserve({ deskId: 1, startDate: '2025-01-01', endDate: '2025-01-02' })
    ).rejects.toThrow('fail reason');
  });
});

describe('api.cancelWhole', () => {
  it('sends delete request', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

    await api.cancelWhole(10);

    expect(fetchMock).toHaveBeenCalledWith('/api/DeskBooking/cancelWhole/10', { method: 'DELETE' });
  });

  it('throws when not ok', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 500 }));

    await expect(api.cancelWhole(20)).rejects.toThrow(/Failed to cancel reservation/);
  });
});

describe('api.cancelDay', () => {
  it('sends delete request with date param', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

    await api.cancelDay(8, '2025-02-02');

    expect(fetchMock).toHaveBeenCalledWith('/api/DeskBooking/cancelDay/8?date=2025-02-02', {
      method: 'DELETE',
    });
  });

  it('throws when not ok', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 400 }));

    await expect(api.cancelDay(9, '2025-03-03')).rejects.toThrow(/Failed to cancel day/);
  });
});


