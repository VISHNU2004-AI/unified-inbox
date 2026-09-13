import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import dotenv from 'dotenv';

dotenv.config();

import { authRouter } from './routes/auth.js';
import { workspaceRouter } from './routes/workspaces.js';
import { conversationRouter } from './routes/conversations.js';
import { messageRouter } from './routes/messages.js';
import { channelRouter } from './routes/channels.js';
import { webhookRouter } from './routes/webhooks.js';
import { simulatorRouter } from './routes/simulator.js';
import { knowledgeRouter } from './routes/knowledge.js';
import { aiRouter } from './routes/ai.js';
import { liveChatRouter } from './routes/livechat.js';
import { subscriptionRouter } from './routes/subscriptions.js';
import { adminRouter } from './routes/admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

declare module 'http' {
  interface IncomingMessage {
    rawBody?: Buffer;
  }
}

// Enable CORS
app.use(cors({
  origin: true,
  credentials: true
}));

// Body Parsers
app.use(express.json({
  limit: '15mb',
  verify: (req, _res, buffer) => {
    if (req.url?.startsWith('/api/webhooks/')) {
      req.rawBody = Buffer.from(buffer);
    }
  },
}));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Static files (for widget.js and widget-demo.html)
app.use(express.static(path.join(__dirname, '../public')));

// --------------------------------------------------------------------------
// Multi-Tenant Real-Time WebSocket Server
// --------------------------------------------------------------------------
export const wss = new WebSocketServer({ server, path: '/ws' });
const clientWorkspaceMap = new Map<WebSocket, string>();

wss.on('connection', (ws) => {
  // Store default room
  clientWorkspaceMap.set(ws, 'global');

  ws.send(JSON.stringify({
    type: 'CONNECTED',
    message: 'Connected to Unified Inbox Real-time Engine',
    timestamp: new Date().toISOString()
  }));

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw.toString());
      if (data.type === 'JOIN_WORKSPACE' && data.workspaceId) {
        clientWorkspaceMap.set(ws, data.workspaceId);
        ws.send(JSON.stringify({
          type: 'WORKSPACE_JOINED',
          workspaceId: data.workspaceId,
          timestamp: new Date().toISOString()
        }));
      }
    } catch (err) {
      console.warn('[WebSocket] Malformed message received:', err);
    }
  });

  ws.on('close', () => {
    clientWorkspaceMap.delete(ws);
  });

  ws.on('error', (err) => {
    console.error('[WebSocket] Client error:', err);
    clientWorkspaceMap.delete(ws);
  });
});

/**
 * Broadcast event to all agents and widgets connected to a specific workspace
 */
export function broadcastToWorkspace(workspaceId: string, payload: any) {
  const messageString = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      const subscribedWs = clientWorkspaceMap.get(client);
      if (subscribedWs === workspaceId || subscribedWs === 'global') {
        client.send(messageString);
      }
    }
  });
}

// --------------------------------------------------------------------------
// REST API Routes
// --------------------------------------------------------------------------
app.use('/api/auth', authRouter);
app.use('/api/workspaces', workspaceRouter);
app.use('/api/conversations', conversationRouter);
app.use('/api/messages', messageRouter);
app.use('/api/channels', channelRouter);
app.use('/api/webhooks', webhookRouter);
app.use('/api/simulator', simulatorRouter);
app.use('/api/knowledge', knowledgeRouter);
app.use('/api/ai', aiRouter);
app.use('/api/livechat', liveChatRouter);
app.use('/api/subscriptions', subscriptionRouter);
app.use('/api/admin', adminRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Unified Inbox Real-Time Core',
    activeWsConnections: wss.clients.size
  });
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Unified Inbox Core Server running on port ${PORT}`);
  console.log(`🔌 WebSocket Server active at ws://localhost:${PORT}/ws`);
  console.log(`💬 Live Chat Widget available at http://localhost:${PORT}/widget.js`);
  console.log(`====================================================`);
});
