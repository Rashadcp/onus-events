import { apiFetch, apiClient } from '../utils/apiClient';
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
export const getInventoryApi = (params?: { department?: string; search?: string; startDate?: string; endDate?: string; includeInactive?: boolean; excludeEventId?: string } | any): Promise<Item[]> => {
  const query = new URLSearchParams();
  if (params && !params.queryKey) {
    if (params.department) query.set('department', params.department);
    if (params.search) query.set('search', params.search);
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    if (params.includeInactive) query.set('includeInactive', 'true');
    if (params.excludeEventId) query.set('excludeEventId', params.excludeEventId);
  }
  
  const queryString = query.toString();
  return apiFetch(`/api/inventory${queryString ? `?${queryString}` : ''}`);
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

export const checkItemAvailabilityApi = (itemId: string, startDate: string, endDate: string): Promise<any> => {
  return apiFetch(`/api/inventory/${itemId}/availability?startDate=${startDate}&endDate=${endDate}`);
};

export const getStockLogsApi = (): Promise<any[]> => {
  return apiFetch('/api/inventory/logs');
};

// 3. Event Booking Services
export const getEventsApi = (params?: { fromDate?: string; toDate?: string; status?: string; search?: string } | any): Promise<Event[]> => {
  const query = new URLSearchParams();
  if (params && !params.queryKey) {
    if (params.fromDate) query.set('fromDate', params.fromDate);
    if (params.toDate) query.set('toDate', params.toDate);
    if (params.status) query.set('status', params.status);
    if (params.search) query.set('search', params.search);
  }

  const queryString = query.toString();
  return apiFetch(`/api/events${queryString ? `?${queryString}` : ''}`);
};

export const getCustomersApi = (): Promise<any[]> => {
  return apiFetch('/api/customers');
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

export const downloadBillingPdfApi = (documentId: string, copyType: string) => {
  return apiClient.get(`/api/billing/${documentId}/pdf?copyType=${copyType}`, {
    responseType: 'blob'
  });
};

export const getBillingDocumentByIdApi = (id: string): Promise<BillingDocument> => {
  return apiFetch(`/api/billing/${id}`);
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

// 7. Item Groups API (Admin-managed groups for Create Event)
export interface ItemGroup {
  _id: string;
  key: string;
  label: string;
  description?: string;
  color?: string;
  sortOrder: number;
  isActive: boolean;
  isDefault: boolean;
}

export const getGroupsApi = (includeInactive = false): Promise<ItemGroup[]> => {
  const query = includeInactive ? '?includeInactive=true' : '';
  return apiFetch(`/api/groups${query}`);
};

export const createGroupApi = (payload: { key: string; label: string; description?: string; color?: string; sortOrder?: number }): Promise<{ group: ItemGroup }> => {
  return apiFetch('/api/groups', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};

export const updateGroupApi = (id: string, payload: Partial<{ label: string; description: string; color: string; sortOrder: number; isActive: boolean }>): Promise<{ group: ItemGroup }> => {
  return apiFetch(`/api/groups/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
};

export const deleteGroupApi = (id: string): Promise<{ message: string }> => {
  return apiFetch(`/api/groups/${id}`, {
    method: 'DELETE'
  });
};

// 8. User Management Services
export const getUsersApi = (role?: string): Promise<User[]> => {
  const query = role ? `?role=${role}` : '';
  return apiFetch(`/api/users${query}`);
};

export const createUserApi = (data: unknown): Promise<User> => {
  return apiFetch('/api/users', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const updateUserApi = (id: string, data: any): Promise<User> => {
  return apiFetch(`/api/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
};

export const deleteUserApi = (id: string): Promise<{ message: string }> => {
  return apiFetch(`/api/users/${id}`, {
    method: 'DELETE'
  });
};

// 9. Upload Services
export interface PresignResponse {
  uploadUrl: string;
  publicUrl: string;
  key: string;
}

export const getS3PresignUrlApi = (payload: { fileName: string; contentType: string; folder: string }): Promise<PresignResponse> => {
  return apiFetch('/api/upload/presign', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};

