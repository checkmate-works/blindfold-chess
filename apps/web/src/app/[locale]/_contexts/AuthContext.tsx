'use client';

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';

import type { Session, SupabaseClient, User } from '@supabase/supabase-js';

import { createClient } from '@/lib/supabase/client';

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabaseRef = useRef<SupabaseClient | null>(null);
  const router = useRouter();
  const locale = useLocale();

  const refreshUser = useCallback(async () => {
    const supabase = supabaseRef.current ?? createClient();
    if (!supabase) return;
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
    const supabase = createClient();
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    supabaseRef.current = supabase;

    refreshUser().finally(() => setIsLoading(false));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (event === 'PASSWORD_RECOVERY') {
        router.push(`/${locale}/reset-password`);
      }
    });

    return () => subscription.unsubscribe();
  }, [router, locale, refreshUser]);

  const signOut = useCallback(async () => {
    const supabase = supabaseRef.current ?? createClient();
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signOut, refreshUser }}>
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
