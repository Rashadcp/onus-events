import { create } from 'zustand';
import { User } from '../types';

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
    // Map backend fields to frontend properties for backward compatibility
    const mappedUser: User = {
      ...user,
      fullName: user.name || user.fullName || '',
      username: user.email || user.username || ''
    };
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', token);
      localStorage.setItem('user', JSON.stringify(mappedUser));
    }

    set({
      user: mappedUser,
      accessToken: token,
      isAuthenticated: true,
      isInitializing: false,
    });
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
    }
    
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
        const parsedUser = JSON.parse(userStr) as User;
        const mappedUser: User = {
          ...parsedUser,
          fullName: parsedUser.name || parsedUser.fullName || '',
          username: parsedUser.email || parsedUser.username || ''
        };
        
        set({
          user: mappedUser,
          accessToken: token,
          isAuthenticated: true,
          isInitializing: false,
        });
      } else {
        set({
          user: null,
          accessToken: token, // null
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
