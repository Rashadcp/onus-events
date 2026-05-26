import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5000';

/**
 * Reusable hook to handle the real-time WebSocket connection to the backend.
 * Automatically triggers cache invalidations for React Query lists to keep the
 * UI perfectly in sync across multiple browser sessions.
 */
export function useInventoryWebSocket() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;
    let isClosedIntentionally = false;

    function connect() {
      if (typeof window === 'undefined') return;

      console.log(`🔌 Establishing WebSocket connection to: ${WS_URL}`);
      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        console.log('✅ Real-time WebSocket connection established successfully.');
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📩 WebSocket Message Received:', message);

          // Handle real-time stock/item change events
          if (
            message.type === 'INVENTORY_CREATED' ||
            message.type === 'INVENTORY_UPDATED' ||
            message.type === 'INVENTORY_DELETED'
          ) {
            console.log('⚡ Invalidating queries for Inventory & Stock Logs...');
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            queryClient.invalidateQueries({ queryKey: ['stockLogs'] });
          }
        } catch (error: any) {
          console.error('⚠️ Failed to parse WebSocket message:', error.message);
        }
      };

      ws.onerror = (err) => {
        console.error('❌ WebSocket encountered an error:', err);
      };

      ws.onclose = () => {
        console.log('🔌 WebSocket connection closed.');
        if (!isClosedIntentionally) {
          console.log('🔄 Attempting WebSocket reconnection in 3 seconds...');
          reconnectTimer = setTimeout(() => {
            connect();
          }, 3000);
        }
      };
    }

    connect();

    // Clean up connections on unmount
    return () => {
      isClosedIntentionally = true;
      if (ws) {
        ws.close();
      }
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
    };
  }, [queryClient]);
}
