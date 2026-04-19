'use client';

import type { ReactNode } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useRouter } from 'next/navigation';

import { useSafeLocale as useLocale } from '@/i18n/use-safe-locale';
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';

import { getSessionUser } from '@/app/[locale]/_actions/getSessionUser';

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Lazily loads the Supabase browser client. The module-level import is
 * intentionally avoided so that anonymous visitors do not download the
 * ~220 KB Supabase SDK chunk on SSR-heavy public pages. The client is
 * only loaded after `getSessionUser()` (a Server Action) reports a
 * non-null user, or when a caller explicitly triggers a sign-in-related
 * action (`refreshUser`, `signOut`).
 *
 * The loaded client is memoised module-wide so repeated calls (from
 * separate effects or from `refreshUser`/`signOut`) share a single
 * instance — important because each fresh client would create its own
 * `onAuthStateChange` broadcast channel and internal cookies.
 */
let supabaseClientPromise: Promise<SupabaseClient | null> | null = null;
function loadSupabaseClient(): Promise<SupabaseClient | null> {
  if (!supabaseClientPromise) {
    supabaseClientPromise = import('@/lib/supabase/client')
      .then(({ createClient }) => createClient())
      .catch((err) => {
        // Reset the module-level cache so the next caller re-initiates the
        // dynamic import. Without this, a transient network failure during
        // the initial chunk load would permanently memoise the rejection and
        // users could never recover without a full page reload.
        supabaseClientPromise = null;
        throw err;
      });
  }
  return supabaseClientPromise;
}

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  // We do not know the auth state until `getSessionUser()` resolves, so the
  // initial state is "loading". The layout no longer seeds `initialUser`
  // (that read forced the entire `[locale]/**` subtree dynamic and blocked
  // ISR on puzzle pages — see F-003 Group A).
  const [isLoading, setIsLoading] = useState(true);
  const supabaseRef = useRef<SupabaseClient | null>(null);
  const router = useRouter();
  const locale = useLocale();
  // Stash the latest router/locale in refs so the auth-state subscription
  // effect can read them without listing them in the dependency array.
  // Listing them directly causes the effect to re-run on every render in
  // test environments where `useRouter()` returns a new object reference
  // each render, tearing down and re-subscribing mid-load.
  const routerRef = useRef(router);
  const localeRef = useRef(locale);
  useEffect(() => {
    routerRef.current = router;
    localeRef.current = locale;
  }, [router, locale]);

  const refreshUser = useCallback(async () => {
    const supabase = supabaseRef.current ?? (await loadSupabaseClient());
    if (!supabase) return;
    supabaseRef.current = supabase;
    const [
      {
        data: { user },
      },
      {
        data: { session },
      },
    ] = await Promise.all([supabase.auth.getUser(), supabase.auth.getSession()]);
    setUser(user);
    setSession(session);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let subscription:
      | ReturnType<SupabaseClient['auth']['onAuthStateChange']>['data']['subscription']
      | null = null;

    (async () => {
      // Ask the server whether a session cookie is present. This is a thin
      // Server Action call — no Supabase browser SDK is downloaded yet.
      let serverUser: User | null = null;
      try {
        serverUser = await getSessionUser();
      } catch {
        serverUser = null;
      }

      if (cancelled) return;

      // Anonymous visit: resolve to loaded-not-authenticated without touching
      // the Supabase SDK. This preserves F-001's bundle-size win for crawlers
      // and anonymous traffic. After a successful sign-in, Supabase's server
      // redirect pattern re-mounts this provider, so `getSessionUser()` will
      // return the new user and the SDK-load path below takes over.
      if (!serverUser) {
        setIsLoading(false);
        return;
      }

      // Authenticated visit: seed UI with the server result, then load the
      // Supabase browser client to hydrate the session and subscribe to
      // auth-state changes.
      setUser(serverUser);

      const supabase = await loadSupabaseClient();
      if (cancelled || !supabase) {
        if (!cancelled) setIsLoading(false);
        return;
      }

      supabaseRef.current = supabase;

      try {
        const [
          {
            data: { user: freshUser },
          },
          {
            data: { session: freshSession },
          },
        ] = await Promise.all([supabase.auth.getUser(), supabase.auth.getSession()]);
        if (!cancelled) {
          setUser(freshUser);
          setSession(freshSession);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }

      if (cancelled) return;

      const {
        data: { subscription: sub },
      } = supabase.auth.onAuthStateChange((event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (event === 'SIGNED_OUT') {
          routerRef.current.refresh();
        }

        if (event === 'PASSWORD_RECOVERY') {
          routerRef.current.push(`/${localeRef.current}/reset-password`);
        }
      });
      subscription = sub;
    })().catch(() => {
      if (!cancelled) setIsLoading(false);
    });

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    const supabase = supabaseRef.current ?? (await loadSupabaseClient());
    if (!supabase) return;
    supabaseRef.current = supabase;

    // Record logout activity event on the server BEFORE signing out.
    // signOut() revokes the session token on the Supabase Auth server,
    // so the fetch must complete first — otherwise getUser() on the
    // server returns null and the event is not recorded.
    try {
      await fetch('/auth/logout', { method: 'POST' });
    } catch {
      // Logging failure must never prevent the user from signing out.
    }

    await supabase.auth.signOut();
  }, []);

  const value = useMemo(
    () => ({ user, session, isLoading, signOut, refreshUser }),
    [user, session, isLoading, signOut, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
