import type { DeskListItemDto, ProfileDto } from './types';

// IMPORTANT: Ensure vite.config.ts includes proxy settings
const BASE_URL = '/api'; 

export const api = {
  getProfile: async (): Promise<ProfileDto> => {
    const response = await fetch(`${BASE_URL}/Profile/1`);
    if (!response.ok) throw new Error('Failed to fetch profile');
    return response.json();
  },

  getDesks: async (startDate: string, endDate: string): Promise<DeskListItemDto[]> => {
    const params = new URLSearchParams({ startDate, endDate });
    const response = await fetch(`${BASE_URL}/DeskBooking/availability?${params}`);
    if (!response.ok) throw new Error('Failed to fetch desk data');
    return response.json();
  },

  reserve: async (data: { deskId: number; startDate: string; endDate: string }) => {
    const response = await fetch(`${BASE_URL}/DeskBooking/reserve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, userId: 1 }),
    });
    if (!response.ok) {
      const msg = await response.text();
      throw new Error(msg || 'Reservation failed');
    }
    return response.json();
  },

  cancelWhole: async (groupId: number) => {
    const response = await fetch(`${BASE_URL}/DeskBooking/cancelWhole/${groupId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to cancel reservation');
  },

  cancelDay: async (groupId: number, date: string) => {
    const response = await fetch(`${BASE_URL}/DeskBooking/cancelDay/${groupId}?date=${date}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to cancel day');
  },
};

