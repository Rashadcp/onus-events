import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

const BASE_URL = 'http://localhost:5000';

// Create an Axios instance
export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Inject accessToken
apiClient.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response Interceptor: Handle 401 token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Check if the error is 401 and it's not a login or refresh request
    if (
      error.response &&
      error.response.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      originalRequest.url !== '/api/auth/login' &&
      originalRequest.url !== '/api/auth/refresh'
    ) {
      originalRequest._retry = true;
      try {
        // Trigger silent token refresh
        const refreshRes = await axios.post(`${BASE_URL}/api/auth/refresh`, {}, {
          headers: { 'Content-Type': 'application/json' },
          withCredentials: true // ensure cookies are sent
        });

        if (refreshRes.status === 200 || refreshRes.status === 201) {
          const newAccessToken = refreshRes.data.accessToken;

          if (typeof window !== 'undefined') {
            localStorage.setItem('accessToken', newAccessToken);
          }
          useAuthStore.setState({ accessToken: newAccessToken, isAuthenticated: true });

          // Retry the original request
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiClient(originalRequest);
        } else {
          useAuthStore.getState().logout();
        }
      } catch (err) {
        useAuthStore.getState().logout();
        return Promise.reject(err);
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Reusable apiFetch wrapper powered by Axios to maintain full compatibility 
 * with the central service layer defined in api.ts.
 */
export async function apiFetch(endpoint: string, options: any = {}): Promise<any> {
  const method = (options.method || 'GET').toLowerCase();
  const data = options.body ? JSON.parse(options.body) : undefined;
  
  try {
    const response = await apiClient({
      url: endpoint,
      method,
      data,
      headers: options.headers,
    });
    return response.data;
  } catch (error: any) {
    const errorMsg = error.response?.data?.error || error.message || 'Request failed';
    throw new Error(errorMsg);
  }
}

/**
 * User Management APIs
 */
export async function getUsers(role?: string) {
  const query = role ? `?role=${role}` : '';
  return apiFetch(`/api/users${query}`);
}

export async function updateUser(id: string, data: any) {
  return apiFetch(`/api/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function deleteUser(id: string) {
  return apiFetch(`/api/users/${id}`, {
    method: 'DELETE'
  });
}
