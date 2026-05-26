import { Server } from 'http';
import WebSocket from 'ws';

let wss: WebSocket.Server | null = null;

/**
 * Initialize the WebSocket Server on the shared Node.js HTTP Server.
 */
export function initWebSocket(server: Server) {
  wss = new WebSocket.Server({ server });

  wss.on('connection', (ws: WebSocket) => {
    console.log('🔌 WebSocket Client Connected');

    // Handle heartbeats / pings or clean disconnects
    ws.on('close', () => {
      console.log('🔌 WebSocket Client Disconnected');
    });

    ws.on('error', (err) => {
      console.error('⚠️ WebSocket connection error:', err.message);
    });
  });

  console.log('⚡ WebSocket Server initialized successfully.');
}

/**
 * Broadcast payload message to all currently open/active client connections.
 */
export function broadcast(data: { type: string; [key: string]: any }) {
  if (!wss) {
    console.warn('⚠️ WebSocket Server is not initialized yet. Skipping broadcast.');
    return;
  }

  const payload = JSON.stringify(data);
  let activeClients = 0;

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
      activeClients++;
    }
  });

  if (activeClients > 0) {
    console.log(`📡 Broadcasted message "${data.type}" to ${activeClients} active clients.`);
  }
}
