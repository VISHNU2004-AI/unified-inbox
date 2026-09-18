'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { getActiveWorkspaceId } from './api';

export type WebSocketStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR';

export type SocketEventHandler = (event: any) => void;

class SocketManager {
  private socket: WebSocket | null = null;
  private listeners: Set<SocketEventHandler> = new Set();
  private statusListeners: Set<(status: WebSocketStatus) => void> = new Set();
  private status: WebSocketStatus = 'DISCONNECTED';
  private reconnectTimer: any = null;
  private currentWorkspaceId: string | null = null;

  constructor() {
    // Singleton
  }

  public getStatus(): WebSocketStatus {
    return this.status;
  }

  private setStatus(status: WebSocketStatus) {
    this.status = status;
    this.statusListeners.forEach((cb) => cb(status));
  }

  public connect(workspaceId?: string) {
    if (typeof window === 'undefined') return;

    if (workspaceId) {
      this.currentWorkspaceId = workspaceId;
    } else {
      this.currentWorkspaceId = getActiveWorkspaceId();
    }

    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      if (this.socket.readyState === WebSocket.OPEN && this.currentWorkspaceId) {
        this.socket.send(JSON.stringify({
          type: 'JOIN_WORKSPACE',
          workspaceId: this.currentWorkspaceId
        }));
      }
      return;
    }

    this.setStatus('CONNECTING');

    const host = window.location.hostname || 'localhost';
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${protocol}://${host}:5000/ws`;

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.setStatus('CONNECTED');
        if (this.currentWorkspaceId) {
          this.socket?.send(JSON.stringify({
            type: 'JOIN_WORKSPACE',
            workspaceId: this.currentWorkspaceId
          }));
        }
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.listeners.forEach((listener) => listener(data));
        } catch (err) {
          console.warn('[Socket] Message parsing error:', err);
        }
      };

      this.socket.onclose = () => {
        this.setStatus('DISCONNECTED');
        this.scheduleReconnect();
      };

      this.socket.onerror = () => {
        this.setStatus('ERROR');
      };
    } catch (err) {
      this.setStatus('ERROR');
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect(this.currentWorkspaceId || undefined);
    }, 3000);
  }

  public joinWorkspace(workspaceId: string) {
    this.currentWorkspaceId = workspaceId;
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'JOIN_WORKSPACE',
        workspaceId
      }));
    } else {
      this.connect(workspaceId);
    }
  }

  public subscribe(handler: SocketEventHandler): () => void {
    this.listeners.add(handler);
    return () => {
      this.listeners.delete(handler);
    };
  }

  public subscribeStatus(handler: (status: WebSocketStatus) => void): () => void {
    this.statusListeners.add(handler);
    handler(this.status);
    return () => {
      this.statusListeners.delete(handler);
    };
  }
}

export const socketManager = new SocketManager();

export function useWebSocket(onEvent?: SocketEventHandler) {
  const [status, setStatus] = useState<WebSocketStatus>(socketManager.getStatus());

  useEffect(() => {
    const unsubStatus = socketManager.subscribeStatus(setStatus);
    const unsubEvent = onEvent ? socketManager.subscribe(onEvent) : () => {};

    socketManager.connect();

    return () => {
      unsubStatus();
      unsubEvent();
    };
  }, [onEvent]);

  const joinWorkspace = useCallback((wsId: string) => {
    socketManager.joinWorkspace(wsId);
  }, []);

  return { status, joinWorkspace };
}
