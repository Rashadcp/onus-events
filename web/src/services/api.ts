import { apiFetch } from '../utils/apiClient';
import { Item, Event, User } from '../types';

/**
 * ----------------------------------------------------
 * ONUS EVENT CENTRALIZED API SERVICE LAYER
 * ----------------------------------------------------
 * Consolidating all frontend API endpoints into a single
 * reusable file allows for centralized route configurations,
 * type assertions, and maintainability.
 */

// 1. Authentication Services
export const loginApi = (payload: { username: string; password: string }) => {
  return apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};

export const logoutApi = () => {
  return apiFetch('/api/auth/logout', {
    method: 'POST'
  });
};

export const registerStaffApi = (payload: Partial<User> & { password?: string }) => {
  return apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};

// 2. Inventory Services
export const getInventoryApi = (): Promise<Item[]> => {
  return apiFetch('/api/inventory');
};

export const createItemApi = (payload: Item) => {
  return apiFetch('/api/inventory', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};

export const linkSubItemsApi = (itemCode: string, subItemCodes: string[]) => {
  return apiFetch(`/api/inventory/${itemCode}/sub-items`, {
    method: 'POST',
    body: JSON.stringify({ subItemCodes })
  });
};

// 3. Event Booking Services
export const getEventsApi = (): Promise<Event[]> => {
  return apiFetch('/api/events');
};

export const createEventApi = (payload: any) => {
  return apiFetch('/api/events', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};

export const confirmDepartmentApi = (eventId: string, department: string) => {
  return apiFetch(`/api/events/${eventId}/confirm-department`, {
    method: 'POST',
    body: JSON.stringify({ department })
  });
};

export const deleteEventApi = (eventId: string) => {
  return apiFetch(`/api/events/${eventId}`, {
    method: 'DELETE'
  });
};

export const recoverEventApi = (eventId: string) => {
  return apiFetch(`/api/events/${eventId}/recover`, {
    method: 'POST'
  });
};
