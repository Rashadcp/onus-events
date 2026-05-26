import { apiFetch } from '../utils/apiClient';
import { BillingDocument, BillingLineItem, Item, Event, User } from '../types';

interface CreateBillingDocumentPayload {
  documentType: 'QUOTATION' | 'INVOICE';
  eventId?: string;
  customer: BillingDocument['customer'];
  event?: BillingDocument['event'];
  terms?: string;
  notes?: string;
  lineItems: Partial<BillingLineItem>[];
}

/**
 * ----------------------------------------------------
 * ONUS EVENT CENTRALIZED API SERVICE LAYER
 * ----------------------------------------------------
 * Consolidating all frontend API endpoints into a single
 * reusable file allows for centralized route configurations,
 * type assertions, and maintainability.
 */

// 1. Authentication Services
export const loginApi = (payload: { email: string; password: string }) => {
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

export const updateItemApi = (itemCode: string, payload: Partial<Item>) => {
  return apiFetch(`/api/inventory/${itemCode}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
};

export const deleteItemApi = (itemCode: string) => {
  return apiFetch(`/api/inventory/${itemCode}`, {
    method: 'DELETE'
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

export const getEventByIdApi = (eventId: string): Promise<Event> => {
  return apiFetch(`/api/events/${eventId}`);
};

export const createEventApi = (payload: any) => {
  return apiFetch('/api/events', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};

export const updateEventApi = (eventId: string, payload: any) => {
  return apiFetch(`/api/events/${eventId}`, {
    method: 'PUT',
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

export const updateEventStatusApi = (eventId: string, eventStatus: string) => {
  return apiFetch(`/api/events/${eventId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ eventStatus })
  });
};

// 4. Billing Services
export const getBillingDocumentsApi = (): Promise<BillingDocument[]> => {
  return apiFetch('/api/billing');
};

export const priceBillingDocumentApi = (lineItems: Partial<BillingLineItem>[]) => {
  return apiFetch('/api/billing/price', {
    method: 'POST',
    body: JSON.stringify({ lineItems })
  });
};

export const createBillingDocumentApi = (payload: CreateBillingDocumentPayload): Promise<BillingDocument> => {
  return apiFetch('/api/billing', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};

export const convertQuotationToInvoiceApi = (quotationId: string): Promise<BillingDocument> => {
  return apiFetch(`/api/billing/${quotationId}/convert-to-invoice`, {
    method: 'POST'
  });
};

// 5. Logistics Services
export const getLogisticsLogApi = (eventId: string): Promise<any> => {
  return apiFetch(`/api/logistics/${eventId}`);
};

export const updateLogisticsLogApi = (eventId: string, payload: any): Promise<any> => {
  return apiFetch(`/api/logistics/${eventId}`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};

// 6. Deleted Event Recovery
export const getDeletedEventsApi = (): Promise<Event[]> => {
  return apiFetch('/api/events?showDeleted=true');
};

