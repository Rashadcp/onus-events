import { create } from 'zustand';

interface User {
  username: string;
  fullName: string;
  role: 'ADMIN' | 'REPRESENTATIVE' | 'LOADING_STAFF' | 'SITE_INCHARGE';
  email?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  initializeSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isInitializing: true,

  login: (user: User, token: string) => {
    localStorage.setItem('accessToken', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({
      user,
      accessToken: token,
      isAuthenticated: true,
      isInitializing: false,
    });
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isInitializing: false,
    });
    // Safely redirect to root login page
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  },

  initializeSession: () => {
    if (typeof window === 'undefined') return;
    
    try {
      const token = localStorage.getItem('accessToken');
      const userStr = localStorage.getItem('user');
      
      if (token && userStr) {
        const user = JSON.parse(userStr) as User;
        set({
          user,
          accessToken: token,
          isAuthenticated: true,
          isInitializing: false,
        });
      } else {
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          isInitializing: false,
        });
      }
    } catch {
      // LocalStorage corrupted or unavailable
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isInitializing: false,
      });
    }
  },
}));
