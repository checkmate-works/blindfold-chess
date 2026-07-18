import type { ReactNode } from 'react';

import { NextIntlClientProvider } from 'next-intl';

import { IntlAvailableContext } from '@/i18n/IntlAvailableContext';
import enMessages from '@/messages/en.json';
import * as matchers from '@testing-library/jest-dom/matchers';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { recordSharedGame } from '@/lib/games/shared-game-store';

import { ClaimGameBanner } from './ClaimGameBanner';

expect.extend(matchers);

const authState = vi.hoisted(() => ({
  user: null as { id: string } | null,
  hasProfile: false,
  isLoading: false,
}));
vi.mock('@/app/[locale]/_contexts/AuthContext', () => ({
  useAuth: () => authState,
}));

const searchParamsState = vi.hoisted(() => ({ claim: null as string | null }));
vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: (key: string) => (key === 'claim' ? searchParamsState.claim : null),
  }),
}));

const mockClaimAction = vi.fn();
vi.mock('../_actions/claim-shared-game', () => ({
  claimSharedGameAction: (...args: unknown[]) => mockClaimAction(...args),
}));

const GAME_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  authState.user = null;
  authState.hasProfile = false;
  authState.isLoading = false;
  searchParamsState.claim = null;
});

function renderBanner(props: Partial<Parameters<typeof ClaimGameBanner>[0]> = {}) {
  const ui: ReactNode = (
    <NextIntlClientProvider
      locale="en"
      messages={enMessages as unknown as Record<string, unknown>}
      timeZone="UTC"
    >
      <IntlAvailableContext.Provider value={true}>
        <ClaimGameBanner gameId={GAME_ID} isAuthorless locale="en" {...props} />
      </IntlAvailableContext.Provider>
    </NextIntlClientProvider>
  );
  act(() => {
    render(ui);
  });
}

describe('ClaimGameBanner', () => {
  it('renders nothing without a manage token in this browser', () => {
    renderBanner();
    expect(screen.queryByText(/part of your record/i)).not.toBeInTheDocument();
  });

  it('renders nothing for an already-authored game even with a stale token', () => {
    recordSharedGame('local-1', GAME_ID, 'tok-1');
    renderBanner({ isAuthorless: false });
    expect(screen.queryByText(/part of your record/i)).not.toBeInTheDocument();
  });

  it('shows the sign-up CTA with a claim-returning next URL when signed out', () => {
    recordSharedGame('local-1', GAME_ID, 'tok-1');
    renderBanner();

    const link = screen.getByRole('link', { name: /sign up and link this game/i });
    expect(link).toHaveAttribute(
      'href',
      `/en/sign-up?next=${encodeURIComponent(`/en/games/shared/${GAME_ID}?claim=1`)}`
    );
  });

  it('shows the claim button for a signed-in user with a profile', () => {
    recordSharedGame('local-1', GAME_ID, 'tok-1');
    authState.user = { id: 'user-1' };
    authState.hasProfile = true;
    renderBanner();

    expect(screen.getByRole('button', { name: /link to my account/i })).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders nothing for a provisional user (signed in, no profile)', () => {
    recordSharedGame('local-1', GAME_ID, 'tok-1');
    authState.user = { id: 'user-1' };
    authState.hasProfile = false;
    renderBanner();

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('auto-claims exactly once when arriving with ?claim=1 as an eligible user', async () => {
    recordSharedGame('local-1', GAME_ID, 'tok-1');
    authState.user = { id: 'user-1' };
    authState.hasProfile = true;
    searchParamsState.claim = '1';
    // Keep the promise pending so the assertion is purely about invocation.
    mockClaimAction.mockReturnValue(new Promise(() => {}));

    renderBanner();

    expect(mockClaimAction).toHaveBeenCalledTimes(1);
    expect(mockClaimAction).toHaveBeenCalledWith(GAME_ID, 'tok-1');
  });

  it('does not auto-claim while signed out, even with ?claim=1', () => {
    recordSharedGame('local-1', GAME_ID, 'tok-1');
    searchParamsState.claim = '1';

    renderBanner();

    expect(mockClaimAction).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: /sign up and link this game/i })).toBeInTheDocument();
  });
});
