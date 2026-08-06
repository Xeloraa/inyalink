import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthSession } from '@inyalink/shared';
import { fetchAuthMe, logoutApi } from './api';
import { setAccessTokenGetter } from './apiClient';
import { getSupabaseBrowser, isSupabaseConfigured } from './supabase';

type AuthValue = {
  session: AuthSession | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const applyToken = useCallback((token: string | null) => {
    setAccessToken(token);
    setAccessTokenGetter(() => token);
  }, []);

  const syncProfile = useCallback(async (token: string | null) => {
    applyToken(token);
    if (!token) {
      setSession(null);
      return;
    }
    try {
      const me = await fetchAuthMe();
      setSession(me.session);
    } catch {
      setSession(null);
    }
  }, [applyToken]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    const supabase = getSupabaseBrowser();
    let cancelled = false;

    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      const token = data.session?.access_token ?? null;
      void syncProfile(token).finally(() => {
        if (!cancelled) setLoading(false);
      });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      const token = next?.access_token ?? null;
      void syncProfile(token);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [syncProfile]);

  const signInWithGoogle = useCallback(async () => {
    const supabase = getSupabaseBrowser();
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    try {
      if (accessToken) await logoutApi();
    } catch {
      /* still clear local session */
    }
    if (isSupabaseConfigured()) {
      await getSupabaseBrowser().auth.signOut();
    }
    applyToken(null);
    setSession(null);
  }, [accessToken, applyToken]);

  const refreshProfile = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      await syncProfile(null);
      return;
    }
    const { data } = await getSupabaseBrowser().auth.getSession();
    await syncProfile(data.session?.access_token ?? null);
  }, [syncProfile]);

  const value = useMemo(
    () => ({
      session,
      loading,
      signInWithGoogle,
      signOut,
      refreshProfile,
    }),
    [session, loading, signInWithGoogle, signOut, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
