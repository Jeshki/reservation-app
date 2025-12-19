import type { DeskListItemDto } from '../types';

const API_URL = '/api/DeskBooking';

export const api = {
  getDesks: async (startDate: string, endDate: string): Promise<DeskListItemDto[]> => {
    const response = await fetch(`${API_URL}/availability?startDate=${startDate}&endDate=${endDate}`);
    if (!response.ok) throw new Error('Failed to fetch desks');
    return response.json();
  },

  reserve: async (data: { deskId: number; startDate: string; endDate: string }) => {
    const response = await fetch(`${API_URL}/reserve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, userId: 1 }), // Mock user ID
    });
    if (!response.ok) {
      const msg = await response.text();
      throw new Error(msg || 'Reservation failed');
    }
    return response.json();
  },

  cancelWhole: async (groupId: number) => {
    const response = await fetch(`${API_URL}/cancelWhole/${groupId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to cancel reservation');
  },

  cancelDay: async (groupId: number, date: string) => {
    const response = await fetch(`${API_URL}/cancelDay/${groupId}?date=${date}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to cancel day');
  },
};