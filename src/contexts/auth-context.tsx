"use client";

import React, { createContext, startTransition, useContext, useEffect, useState, useCallback } from 'react';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  avatarUrl: string;
  headline: string;
  emailVerified: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  refresh: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = res.ok ? await res.json() : null;
      // A transition, not an urgent update: when /api/auth/me answers before
      // a streamed part of the page has hydrated, an urgent context change
      // forces React to throw that part away and re-render it on the client
      // (hydration error #418, plus a visible flash). Transitions wait for
      // hydration to finish first.
      startTransition(() => {
        if (data) setUser(data.user);
        else if (res.status === 401 || res.status === 403) setUser(null);
        setLoading(false);
      });
    } catch {
      // Keep the existing session state during transient network failures.
      startTransition(() => setLoading(false));
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    window.location.href = '/login';
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refresh: fetchMe, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
