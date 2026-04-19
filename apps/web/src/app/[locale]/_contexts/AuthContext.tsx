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
 * only loaded when an authenticated session exists (seeded via SSR) or
 * when a caller explicitly triggers a sign-in-related action.
 *
 * The loaded client is memoised module-wide so repeated calls (from
 * separate effects or from `refreshUser`/`signOut`) share a single
 * instance — important because each fresh client would create its own
 * `onAuthStateChange` broadcast channel and internal cookies.
 */
let supabaseClientPromise: Promise<SupabaseClient | null> | null = null;
function loadSupabaseClient(): Promise<SupabaseClient | null> {
  if (!supabaseClientPromise) {
    supabaseClientPromise = import('@/lib/supabase/client').then(({ createClient }) =>
      createClient()
    );
  }
  return supabaseClientPromise;
}

type AuthProviderProps = {
  children: ReactNode;
  /**
   * Optional SSR-seeded user. When provided, the initial render does not
   * flash the `isLoading` state and — if `null` — the Supabase SDK is
   * not loaded at all. Defaults to `null` which preserves the historical
   * "loading → refresh" behaviour for contexts where no SSR seed is
   * available (e.g. certain test harnesses).
   */
  initialUser?: User | null;
};

export function AuthProvider({ children, initialUser = null }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [session, setSession] = useState<Session | null>(null);
  // When we have an SSR seed we already know the auth state, so we skip the
  // initial loading flicker. Without a seed we preserve the legacy "start
  // loading, resolve after refresh" flow so existing consumers/tests keep
  // working.
  const [isLoading, setIsLoading] = useState(initialUser === null);
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

  // Only tracks whether an SSR seed was initially provided — the effect below
  // intentionally does NOT re-run when `initialUser` changes on subsequent
  // renders. Navigation-driven auth changes are handled by `onAuthStateChange`
  // (which Supabase fires after server-side sign-in redirects restore the
  // session cookie), keeping the effect's lifecycle stable.
  const hasInitialUser = initialUser !== null;

  useEffect(() => {
    // Anonymous visit: skip loading Supabase entirely. This is the whole
    // point of F-001 — SEO/crawler traffic must not pay for the SDK.
    if (!hasInitialUser) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    let subscription:
      | ReturnType<SupabaseClient['auth']['onAuthStateChange']>['data']['subscription']
      | null = null;

    loadSupabaseClient()
      .then(async (supabase) => {
        if (cancelled || !supabase) {
          if (!cancelled) setIsLoading(false);
          return;
        }

        supabaseRef.current = supabase;

        // Hydrate the session from the Supabase client (the SSR seed only
        // carries the user, not the session tokens). getUser() also refreshes
        // the session cookie if needed.
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
      })
      .catch(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, [hasInitialUser]);

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
