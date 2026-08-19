import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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

  // Dedup: the mount check, onAuthStateChange (INITIAL_SESSION + SIGNED_IN),
  // and AuthCallback's own refresh can all observe the same token within
  // milliseconds of each other. Only the first call for a given token hits
  // /auth/me; later calls for the same token reuse that in-flight/settled
  // result instead of firing a redundant round trip. syncedTokenRef tracks
  // which token the current state reflects (or is being fetched for);
  // syncInFlightRef holds that fetch's promise while it's pending.
  const syncedTokenRef = useRef<string | null>(null);
  const syncInFlightRef = useRef<Promise<void> | null>(null);

  const syncProfile = useCallback(async (token: string | null): Promise<void> => {
    if (syncedTokenRef.current === token) {
      return syncInFlightRef.current ?? undefined;
    }
    syncedTokenRef.current = token;

    const run = async (): Promise<void> => {
      if (!token) {
        applyToken(null);
        setSession(null);
        return;
      }
      // Attach the token only after /me succeeds — a failed verify must not
      // leave a bad Bearer on later public GETs.
      try {
        applyToken(token);
        const me = await fetchAuthMe();
        // A newer token may have superseded this one while we awaited —
        // don't let a stale response clobber a more recent sync's result.
        if (syncedTokenRef.current !== token) return;
        setSession(me.session);
      } catch {
        if (syncedTokenRef.current !== token) return;
        applyToken(null);
        setSession(null);
      }
    };

    const promise = run().finally(() => {
      if (syncInFlightRef.current === promise) {
        syncInFlightRef.current = null;
      }
    });
    syncInFlightRef.current = promise;
    return promise;
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
    syncedTokenRef.current = null;
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
