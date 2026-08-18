import React from 'react';

import type { User } from '@supabase/supabase-js';
import { act, cleanup, render, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider, useAuth } from './AuthContext';

const mockGetUser = vi.fn();
const mockGetSession = vi.fn();
const mockSignOut = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockGetSessionUser = vi.fn();

vi.mock('next-intl', () => ({
  useLocale: () => 'en',
}));

const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock('@/lib/supabase/client', () => {
  const createClient = () => ({
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
      getSession: (...args: unknown[]) => mockGetSession(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
    },
  });
  return { createClient };
});

vi.mock('@/app/[locale]/_actions/getSessionUser', () => ({
  // The action now returns `{ user, hasProfile }`; the existing tests seed a
  // bare `User | null` via `mockGetSessionUser`, so adapt it to the new shape
  // here (a resolved user is treated as a confirmed member).
  getSessionUser: async (...args: unknown[]) => {
    const user = await mockGetSessionUser(...args);
    return { user: user ?? null, hasProfile: user != null };
  },
}));

// Most tests exercise the "authenticated" path where the server-side session
// read returns a user and the AuthProvider eagerly loads the Supabase client
// after mount. Configuring `mockGetSessionUser` to resolve with this user in
// `beforeEach` drives the same code path that an authenticated visitor hits.
const seededUser = { id: 'seed-user', email: 'seed@example.com' } as unknown as User;

function wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe('AuthContext', () => {
  beforeEach(() => {
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    // Default to authenticated; individual "anonymous" tests override this.
    mockGetSessionUser.mockResolvedValue(seededUser);
  });

  afterEach(() => {
    cleanup();
  });

  describe('initialization', () => {
    it('resolves isLoading to false after Supabase hydration when authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: seededUser } });
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'tok', user: seededUser } },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('hydrates user and session from Supabase after authenticated mount', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      const mockSession = { access_token: 'token', user: mockUser };

      mockGetUser.mockResolvedValue({ data: { user: mockUser } });
      mockGetSession.mockResolvedValue({ data: { session: mockSession } });

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Wait for the Supabase client to finish hydration — `onAuthStateChange`
      // is set up at the end of the effect, so its invocation is a reliable
      // signal that getUser/getSession have resolved.
      await waitFor(() => {
        expect(mockOnAuthStateChange).toHaveBeenCalled();
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.session).toEqual(mockSession);
      expect(result.current.isLoading).toBe(false);
    });

    it('clears user when Supabase hydration returns null (stale server read)', async () => {
      // Supabase client methods return error objects rather than throwing,
      // but getUser/getSession in Promise.all could still technically reject.
      // Here we test the non-throwing error case (Supabase's typical pattern).
      // The server-read user stays behind until the client hydration overwrites
      // it with the "no user" result — simulating a stale cookie scenario.
      mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Unauthorized' } });
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Unauthorized' },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Wait for the client hydration to overwrite the seeded user with null.
      await waitFor(() => {
        expect(result.current.user).toBeNull();
        expect(result.current.session).toBeNull();
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('skips Supabase entirely when anonymous (server reports no user)', async () => {
      mockGetSessionUser.mockResolvedValue(null);

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Anonymous visitors resolve to loaded-not-authenticated immediately
      // without touching the Supabase client — this is the F-001 win.
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
      expect(mockGetUser).not.toHaveBeenCalled();
      expect(mockGetSession).not.toHaveBeenCalled();
      expect(mockOnAuthStateChange).not.toHaveBeenCalled();
    });

    it('treats a failing getSessionUser as anonymous', async () => {
      mockGetSessionUser.mockRejectedValue(new Error('network'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(mockGetUser).not.toHaveBeenCalled();
      expect(mockOnAuthStateChange).not.toHaveBeenCalled();
    });

    it('unsubscribes even if unmounted during client load', async () => {
      // Regression test: the bug fix handles the case where the component
      // unmounts while the async IIFE is awaiting between
      // `loadSupabaseClient()` and the `onAuthStateChange` call — specifically
      // during the `Promise.all([getUser, getSession])` step. Before the fix,
      // `onAuthStateChange` still ran and created a subscription, but the
      // cleanup function had already captured `subscription === null` and
      // could not unsubscribe it — a memory/listener leak. The fix adds a
      // post-subscription `if (cancelled) sub.unsubscribe()` guard.
      //
      // Module state (`supabaseClientPromise`) is memoised module-wide in
      // AuthContext, and earlier tests in this file may have already resolved
      // it. Reset modules + re-mock with a controllable promise so we can
      // freeze the inner getUser/getSession await at will.
      vi.resetModules();

      let resolveHydration: (() => void) | null = null;
      const hydrationPromise = new Promise<void>((r) => {
        resolveHydration = r;
      });

      const unsubscribeSpy = vi.fn();
      // Hold getUser/getSession open so we can unmount AFTER
      // `loadSupabaseClient()` has resolved but BEFORE `onAuthStateChange`
      // runs. This is the exact window the fix needs to cover.
      const slowGetUser = vi
        .fn()
        .mockImplementation(() => hydrationPromise.then(() => ({ data: { user: seededUser } })));
      const slowGetSession = vi.fn().mockImplementation(() =>
        hydrationPromise.then(() => ({
          data: { session: { access_token: 'tok', user: seededUser } },
        }))
      );
      const slowOnAuthStateChange = vi.fn(() => ({
        data: { subscription: { unsubscribe: unsubscribeSpy } },
      }));

      vi.doMock('@/lib/supabase/client', () => ({
        createClient: () => ({
          auth: {
            getUser: slowGetUser,
            getSession: slowGetSession,
            signOut: vi.fn(),
            onAuthStateChange: slowOnAuthStateChange,
          },
        }),
      }));

      vi.doMock('next/navigation', () => ({
        useRouter: () => ({
          push: mockPush,
          refresh: mockRefresh,
          replace: vi.fn(),
          back: vi.fn(),
          forward: vi.fn(),
          prefetch: vi.fn(),
        }),
      }));

      vi.doMock('@/app/[locale]/_actions/getSessionUser', () => ({
        getSessionUser: () => Promise.resolve({ user: seededUser, hasProfile: true }),
      }));

      vi.doMock('next-intl', () => ({
        useLocale: () => 'en',
      }));

      // Re-import AuthProvider so it picks up the fresh mocks and a fresh
      // module-level `supabaseClientPromise` cache.
      const { AuthProvider: FreshAuthProvider } = await import('./AuthContext');

      const { unmount } = render(
        <FreshAuthProvider>
          <div>child</div>
        </FreshAuthProvider>
      );

      // Wait until the effect has reached the getUser/getSession await
      // (i.e. `loadSupabaseClient()` has resolved). At that point both spies
      // have been called but neither Promise.all has resolved yet.
      await waitFor(() => {
        expect(slowGetUser).toHaveBeenCalled();
        expect(slowGetSession).toHaveBeenCalled();
      });

      // Unmount now — this sets `cancelled = true` before `onAuthStateChange`
      // is reached.
      unmount();

      // Let the Promise.all resolve so the IIFE proceeds to
      // `onAuthStateChange(...)` and then the post-subscription guard.
      resolveHydration!();

      await waitFor(() => {
        expect(slowOnAuthStateChange).toHaveBeenCalled();
      });

      // The fix's `if (cancelled) sub.unsubscribe()` must run. Without the
      // fix, the subscription leaks (unsubscribe is never called).
      await waitFor(() => {
        expect(unsubscribeSpy).toHaveBeenCalledTimes(1);
      });

      vi.doUnmock('@/lib/supabase/client');
      vi.doUnmock('next/navigation');
      vi.doUnmock('@/app/[locale]/_actions/getSessionUser');
      vi.doUnmock('next-intl');
    });

    it('recovers from a failed initial Supabase chunk load on a subsequent attempt', async () => {
      // Regression test for the fix in AuthContext.tsx:
      //   supabaseClientPromise = import('@/lib/supabase/client')
      //     .then(({ createClient }) => createClient())
      //     .catch((err) => {
      //       supabaseClientPromise = null;
      //       throw err;
      //     });
      //
      // Without the `.catch` that resets `supabaseClientPromise = null`, a
      // chunk-load failure during the first `import()` would permanently
      // memoise a rejected promise. Every subsequent caller (refreshUser,
      // signOut, a later AuthProvider mount) would await the same rejected
      // promise and fail until the user fully reloaded the page.
      //
      // The module-level `supabaseClientPromise` is shared across all callers,
      // so we reset modules and install fresh mocks to guarantee a clean
      // cache. The test asserts that `createClient` is invoked a SECOND time
      // after the first attempt fails — proving the cache was cleared and the
      // fresh import pipeline ran again.
      vi.resetModules();

      let createClientCallCount = 0;
      const successfulAuth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: seededUser } }),
        getSession: vi.fn().mockResolvedValue({
          data: { session: { access_token: 'tok', user: seededUser } },
        }),
        signOut: vi.fn(),
        onAuthStateChange: vi.fn(() => ({
          data: { subscription: { unsubscribe: vi.fn() } },
        })),
      };

      vi.doMock('@/lib/supabase/client', () => ({
        createClient: () => {
          createClientCallCount += 1;
          if (createClientCallCount === 1) {
            // Simulate a transient chunk-load / initialization failure on the
            // first attempt. Throwing from createClient lands in the same
            // `.catch` branch that the real chunk-load rejection would hit.
            throw new Error('ChunkLoadError: simulated failure');
          }
          return {
            auth: successfulAuth,
          };
        },
      }));

      vi.doMock('next/navigation', () => ({
        useRouter: () => ({
          push: mockPush,
          refresh: mockRefresh,
          replace: vi.fn(),
          back: vi.fn(),
          forward: vi.fn(),
          prefetch: vi.fn(),
        }),
      }));

      vi.doMock('@/app/[locale]/_actions/getSessionUser', () => ({
        getSessionUser: () => Promise.resolve({ user: seededUser, hasProfile: true }),
      }));

      vi.doMock('next-intl', () => ({
        useLocale: () => 'en',
      }));

      // Re-import AuthProvider + useAuth so they pick up the fresh mocks AND a
      // fresh module-level `supabaseClientPromise` cache.
      const { AuthProvider: FreshAuthProvider, useAuth: useFreshAuth } =
        await import('./AuthContext');

      function freshWrapper({ children }: { children: React.ReactNode }) {
        return <FreshAuthProvider>{children}</FreshAuthProvider>;
      }

      const { result } = renderHook(() => useFreshAuth(), { wrapper: freshWrapper });

      // First attempt fails inside the IIFE's `.catch(() => setIsLoading(false))`.
      // The observable contract: the provider surfaces the failure by
      // finishing loading without hydrating the session — `getSessionUser()`
      // seeds `user` from the server read (so it is `seededUser`), but the
      // client-side hydration that would populate `session` never completes,
      // and `onAuthStateChange` is never wired up.
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(createClientCallCount).toBe(1);
      expect(result.current.session).toBeNull();
      expect(successfulAuth.onAuthStateChange).not.toHaveBeenCalled();

      // Trigger a second load path. If the rejection was cached (i.e. the fix
      // is absent), `refreshUser` awaits the SAME rejected promise and
      // `createClient` is never called again — the assertion below would fail.
      // With the fix, the `.catch` reset clears the cache so the next call
      // freshly re-imports and `createClient` runs a second time, now
      // succeeding and hydrating the user.
      await act(async () => {
        await result.current.refreshUser();
      });

      expect(createClientCallCount).toBe(2);
      expect(successfulAuth.getUser).toHaveBeenCalled();
      expect(successfulAuth.getSession).toHaveBeenCalled();
      expect(result.current.user).toEqual(seededUser);

      vi.doUnmock('@/lib/supabase/client');
      vi.doUnmock('next/navigation');
      vi.doUnmock('@/app/[locale]/_actions/getSessionUser');
      vi.doUnmock('next-intl');
    });
  });

  describe('ads-hidden attribute sync', () => {
    // Regression test: the inline bootstrap script in <head> only runs at
    // initial document parse. On the first sign-in within a session, the
    // `bfc_ads_hidden` cookie is written by `getSessionUser()` AFTER the
    // bootstrap has already run, so without an explicit client-side
    // re-assertion the `<html data-ads-hidden>` attribute is never set even
    // though the cookie is. AdSense gates push solely on the attribute, so
    // ads would leak on subsequent client-side navigations (e.g., language
    // switch) until a hard reload re-ran the bootstrap with the cookie now
    // present. Confirmed in production by manual repro 2026-05-09.
    function clearAdsHiddenState() {
      document.cookie = 'bfc_ads_hidden=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
      delete document.documentElement.dataset.adsHidden;
    }

    beforeEach(clearAdsHiddenState);
    afterEach(clearAdsHiddenState);

    it("sets data-ads-hidden='true' when the cookie is present after getSessionUser", async () => {
      document.cookie = 'bfc_ads_hidden=1; path=/';
      mockGetUser.mockResolvedValue({ data: { user: seededUser } });
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'tok', user: seededUser } },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(document.documentElement.dataset.adsHidden).toBe('true');
    });

    it('removes a stale data-ads-hidden when the cookie is absent (e.g., entitlement lapsed)', async () => {
      // Pre-existing attribute simulates the lingering state from a previous
      // session before the entitlement lapsed.
      document.documentElement.setAttribute('data-ads-hidden', 'true');
      mockGetSessionUser.mockResolvedValue(null);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(document.documentElement.dataset.adsHidden).toBeUndefined();
    });

    it('does not set data-ads-hidden when neither cookie nor entitlement exists', async () => {
      mockGetSessionUser.mockResolvedValue(null);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(document.documentElement.dataset.adsHidden).toBeUndefined();
    });
  });

  describe('signOut', () => {
    it('calls supabase.auth.signOut', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: '1', email: 'a@b.com' } } });
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 't', user: { id: '1' } } },
      });
      mockSignOut.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });
  });

  describe('onAuthStateChange', () => {
    it('updates user and session when auth state changes', async () => {
      mockGetUser.mockResolvedValue({ data: { user: seededUser } });
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'tok', user: seededUser } },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(mockOnAuthStateChange).toHaveBeenCalled();
      });

      // Simulate onAuthStateChange callback
      const callback = mockOnAuthStateChange.mock.calls[0][0];
      const newUser = { id: 'user-3', email: 'state@example.com' };
      const newSession = { access_token: 'state-token', user: newUser };

      act(() => {
        callback('SIGNED_IN', newSession);
      });

      expect(result.current.session).toEqual(newSession);
      expect(result.current.user).toEqual(newUser);
    });

    it('clears user when session becomes null (sign out)', async () => {
      const initialUser = { id: 'user-4', email: 'clear@example.com' } as unknown as User;
      mockGetSessionUser.mockResolvedValue(initialUser);
      mockGetUser.mockResolvedValue({ data: { user: initialUser } });
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'tok', user: initialUser } },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(mockOnAuthStateChange).toHaveBeenCalled();
      });

      // Simulate sign out via auth state change
      const callback = mockOnAuthStateChange.mock.calls[0][0];
      act(() => {
        callback('SIGNED_OUT', null);
      });

      expect(result.current.session).toBeNull();
      expect(result.current.user).toBeNull();
    });

    it('calls router.refresh on SIGNED_OUT event to sync server state', async () => {
      const initialUser = { id: 'user-6', email: 'signout@example.com' } as unknown as User;
      mockGetSessionUser.mockResolvedValue(initialUser);
      mockGetUser.mockResolvedValue({ data: { user: initialUser } });
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'tok', user: initialUser } },
      });

      renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(mockOnAuthStateChange).toHaveBeenCalled();
      });

      const callback = mockOnAuthStateChange.mock.calls[0][0];
      act(() => {
        callback('SIGNED_OUT', null);
      });

      expect(mockRefresh).toHaveBeenCalled();
    });

    it('does not call router.refresh on SIGNED_IN event', async () => {
      mockGetUser.mockResolvedValue({ data: { user: seededUser } });
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'tok', user: seededUser } },
      });

      renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(mockOnAuthStateChange).toHaveBeenCalled();
      });

      mockRefresh.mockClear();

      const callback = mockOnAuthStateChange.mock.calls[0][0];
      const newUser = { id: 'user-si', email: 'signin@example.com' };
      const newSession = { access_token: 'si-token', user: newUser };

      act(() => {
        callback('SIGNED_IN', newSession);
      });

      expect(mockRefresh).not.toHaveBeenCalled();
    });

    it('does not call router.refresh on TOKEN_REFRESHED event', async () => {
      const initialUser = { id: 'user-tr', email: 'tokenrefresh@example.com' } as unknown as User;
      const initialSession = { access_token: 'old-token', user: initialUser };
      mockGetSessionUser.mockResolvedValue(initialUser);
      mockGetUser.mockResolvedValue({ data: { user: initialUser } });
      mockGetSession.mockResolvedValue({ data: { session: initialSession } });

      renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(mockOnAuthStateChange).toHaveBeenCalled();
      });

      mockRefresh.mockClear();

      const callback = mockOnAuthStateChange.mock.calls[0][0];
      const refreshedSession = { access_token: 'new-token', user: initialUser };

      act(() => {
        callback('TOKEN_REFRESHED', refreshedSession);
      });

      expect(mockRefresh).not.toHaveBeenCalled();
    });

    it('does not call router.refresh on USER_UPDATED event', async () => {
      const initialUser = { id: 'user-uu', email: 'userupdate@example.com' } as unknown as User;
      mockGetSessionUser.mockResolvedValue(initialUser);
      mockGetUser.mockResolvedValue({ data: { user: initialUser } });
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'tok', user: initialUser } },
      });

      renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(mockOnAuthStateChange).toHaveBeenCalled();
      });

      mockRefresh.mockClear();

      const callback = mockOnAuthStateChange.mock.calls[0][0];
      const updatedUser = { ...initialUser, email: 'updated@example.com' };
      const updatedSession = { access_token: 'tok', user: updatedUser };

      act(() => {
        callback('USER_UPDATED', updatedSession);
      });

      expect(mockRefresh).not.toHaveBeenCalled();
    });

    it('navigates to reset-password page on PASSWORD_RECOVERY event', async () => {
      mockGetUser.mockResolvedValue({ data: { user: seededUser } });
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'tok', user: seededUser } },
      });

      renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(mockOnAuthStateChange).toHaveBeenCalled();
      });

      const callback = mockOnAuthStateChange.mock.calls[0][0];
      act(() => {
        callback('PASSWORD_RECOVERY', { access_token: 'recovery-token', user: { id: '5' } });
      });

      expect(mockPush).toHaveBeenCalledWith('/en/reset-password');
    });
  });

  describe('refreshUser', () => {
    it('exposes refreshUser as a function in the context value', async () => {
      mockGetUser.mockResolvedValue({ data: { user: seededUser } });
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'tok', user: seededUser } },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(typeof result.current.refreshUser).toBe('function');
    });

    it('updates user and session when refreshUser is called explicitly', async () => {
      // Start authenticated so the Supabase client is loaded.
      mockGetUser.mockResolvedValue({ data: { user: seededUser } });
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'seed-token', user: seededUser } },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Simulate a refresh returning a different user (e.g. after profile
      // update / server-side re-auth).
      const newUser = { id: 'user-refresh', email: 'refresh@example.com' };
      const newSession = { access_token: 'refresh-token', user: newUser };
      mockGetUser.mockResolvedValue({ data: { user: newUser } });
      mockGetSession.mockResolvedValue({ data: { session: newSession } });

      await act(async () => {
        await result.current.refreshUser();
      });

      expect(result.current.user).toEqual(newUser);
      expect(result.current.session).toEqual(newSession);
    });
  });

  describe('useAuth outside provider', () => {
    it('throws error when used outside AuthProvider', () => {
      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');
    });
  });
});
