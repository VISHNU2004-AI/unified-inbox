'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiFetch, getAuthToken, setAuthToken, removeAuthToken, getActiveWorkspaceId, setActiveWorkspaceId } from './api';
import { socketManager } from './socket';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  signup: (payload: { name: string; email: string; password: string; workspaceName?: string }) => Promise<void>;
  logout: () => void;
  switchWorkspace: (workspaceId: string) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setWorkspaces([]);
      setCurrentWorkspace(null);
      setIsLoading(false);
      return;
    }

    try {
      const data = await apiFetch('/api/auth/me');
      if (data && data.user) {
        setUser(data.user);
        const wsList = data.workspaces || [];
        setWorkspaces(wsList);

        const storedWsId = getActiveWorkspaceId();
        const active = wsList.find((w: Workspace) => w.id === storedWsId) || wsList[0] || null;
        setCurrentWorkspace(active);

        if (active) {
          setActiveWorkspaceId(active.id);
          socketManager.joinWorkspace(active.id);
        }
      }
    } catch (err) {
      console.warn('[Auth] Session check failed:', err);
      removeAuthToken();
      setUser(null);
      setCurrentWorkspace(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async ({ email, password }: { email: string; password: string }) => {
    setIsLoading(true);
    try {
      const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (data.token) {
        setAuthToken(data.token);
        setUser(data.user);
        const wsList = data.workspaces || [];
        setWorkspaces(wsList);

        const firstWs = wsList[0] || null;
        setCurrentWorkspace(firstWs);
        if (firstWs) {
          setActiveWorkspaceId(firstWs.id);
          socketManager.joinWorkspace(firstWs.id);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (payload: { name: string; email: string; password: string; workspaceName?: string }) => {
    setIsLoading(true);
    try {
      const data = await apiFetch('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (data.token) {
        setAuthToken(data.token);
        setUser(data.user);
        const wsList = data.workspaces || [];
        setWorkspaces(wsList);
        const firstWs = wsList[0] || null;
        setCurrentWorkspace(firstWs);
        if (firstWs) {
          setActiveWorkspaceId(firstWs.id);
          socketManager.joinWorkspace(firstWs.id);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    removeAuthToken();
    setUser(null);
    setWorkspaces([]);
    setCurrentWorkspace(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  const switchWorkspace = (workspaceId: string) => {
    const ws = workspaces.find((w) => w.id === workspaceId);
    if (ws) {
      setCurrentWorkspace(ws);
      setActiveWorkspaceId(ws.id);
      socketManager.joinWorkspace(ws.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        workspaces,
        currentWorkspace,
        isLoading,
        login,
        signup,
        logout,
        switchWorkspace,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
