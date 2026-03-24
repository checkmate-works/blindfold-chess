import React from 'react';

import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider, useAuth } from './AuthContext';

const mockGetUser = vi.fn();
const mockGetSession = vi.fn();
const mockSignOut = vi.fn();
const mockOnAuthStateChange = vi.fn();

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

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
      getSession: mockGetSession,
      signOut: mockSignOut,
      onAuthStateChange: mockOnAuthStateChange,
    },
  }),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe('initialization', () => {
    it('sets isLoading to true initially, then false after initialization completes', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });
      mockGetSession.mockResolvedValue({ data: { session: null } });

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('loads user and session on mount via refreshUser', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      const mockSession = { access_token: 'token', user: mockUser };

      mockGetUser.mockResolvedValue({ data: { user: mockUser } });
      mockGetSession.mockResolvedValue({ data: { session: mockSession } });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.session).toEqual(mockSession);
    });

    it('sets isLoading to false even when getUser/getSession return error objects', async () => {
      // Supabase client methods return error objects rather than throwing,
      // but getUser/getSession in Promise.all could still technically reject.
      // Here we test the non-throwing error case (Supabase's typical pattern).
      mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Unauthorized' } });
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Unauthorized' },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
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
      mockGetUser.mockResolvedValue({ data: { user: null } });
      mockGetSession.mockResolvedValue({ data: { session: null } });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
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
      const initialUser = { id: 'user-4', email: 'clear@example.com' };
      mockGetUser.mockResolvedValue({ data: { user: initialUser } });
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'tok', user: initialUser } },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toEqual(initialUser);
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
      const initialUser = { id: 'user-6', email: 'signout@example.com' };
      mockGetUser.mockResolvedValue({ data: { user: initialUser } });
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'tok', user: initialUser } },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toEqual(initialUser);
      });

      const callback = mockOnAuthStateChange.mock.calls[0][0];
      act(() => {
        callback('SIGNED_OUT', null);
      });

      expect(mockRefresh).toHaveBeenCalled();
    });

    it('does not call router.refresh on SIGNED_IN event', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });
      mockGetSession.mockResolvedValue({ data: { session: null } });

      renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(mockGetUser).toHaveBeenCalled();
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
      const initialUser = { id: 'user-tr', email: 'tokenrefresh@example.com' };
      const initialSession = { access_token: 'old-token', user: initialUser };
      mockGetUser.mockResolvedValue({ data: { user: initialUser } });
      mockGetSession.mockResolvedValue({ data: { session: initialSession } });

      renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(mockGetUser).toHaveBeenCalled();
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
      const initialUser = { id: 'user-uu', email: 'userupdate@example.com' };
      mockGetUser.mockResolvedValue({ data: { user: initialUser } });
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'tok', user: initialUser } },
      });

      renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(mockGetUser).toHaveBeenCalled();
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
      mockGetUser.mockResolvedValue({ data: { user: null } });
      mockGetSession.mockResolvedValue({ data: { session: null } });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const callback = mockOnAuthStateChange.mock.calls[0][0];
      act(() => {
        callback('PASSWORD_RECOVERY', { access_token: 'recovery-token', user: { id: '5' } });
      });

      expect(mockPush).toHaveBeenCalledWith('/en/reset-password');
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
