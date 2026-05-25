import { create } from 'zustand';

type NotificationType = 'success' | 'error' | 'warning' | null;

interface NotificationState {
  message: string | null;
  type: NotificationType;
  timeoutId: NodeJS.Timeout | null;
  setMessage: (message: string, type: 'success' | 'error' | 'warning', durationMs?: number) => void;
  clearMessage: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  message: null,
  type: null,
  timeoutId: null,

  setMessage: (message: string, type: 'success' | 'error' | 'warning', durationMs = 5000) => {
    // Clear any existing active auto-dismiss timer
    const activeTimeout = get().timeoutId;
    if (activeTimeout) {
      clearTimeout(activeTimeout);
    }

    // Set auto-dismiss timer
    const timeoutId = setTimeout(() => {
      get().clearMessage();
    }, durationMs);

    set({
      message,
      type,
      timeoutId,
    });
  },

  clearMessage: () => {
    const activeTimeout = get().timeoutId;
    if (activeTimeout) {
      clearTimeout(activeTimeout);
    }
    set({
      message: null,
      type: null,
      timeoutId: null,
    });
  },
}));
