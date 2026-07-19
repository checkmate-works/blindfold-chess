import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGuard = vi.fn();
const mockAuthorize = vi.fn();
const mockClaim = vi.fn();
const mockEvaluateRanks = vi.fn();
const mockCookieRefresh = vi.fn();
const mockGameLookup = vi.fn();

vi.mock('server-only', () => ({}));

vi.mock('@/lib/auth', () => ({
  authenticateGuardAndRequireProfile: (...args: unknown[]) => mockGuard(...args),
}));

vi.mock('@/lib/db/games-auth', () => ({
  authorizeGameMutation: (...args: unknown[]) => mockAuthorize(...args),
}));

vi.mock('@/lib/db/games-read', () => ({
  getLiveGameAuthorId: (...args: unknown[]) => mockGameLookup(...args),
}));

vi.mock('@/lib/db/games-write', () => ({
  claimSharedGame: (...args: unknown[]) => mockClaim(...args),
}));

vi.mock('@/lib/db/rank-evaluation', () => ({
  evaluateRanksAfterCreate: (...args: unknown[]) => mockEvaluateRanks(...args),
}));

vi.mock('@/lib/ads/ads-hidden-cookie-writer', () => ({
  refreshAdsHiddenCookieOnDanPromotion: (...args: unknown[]) => mockCookieRefresh(...args),
}));

vi.mock('@/lib/security/rate-limit', () => ({
  RATE_LIMITS: {
    claimSharedGame: { action: 'claim_shared_game', maxAttempts: 10, windowMs: 3_600_000 },
  },
}));

vi.mock('@/lib/server-action-error', () => ({
  handleServerActionError: () => ({ success: false, error: 'unexpected_error' }),
}));

const GAME_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const USER_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const TOKEN = 'raw-manage-token';

const { claimSharedGameAction } = await import('./claim-shared-game');

describe('claimSharedGameAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGuard.mockResolvedValue({ user: { id: USER_ID } });
    mockAuthorize.mockResolvedValue('ok');
    mockClaim.mockResolvedValue(true);
    mockEvaluateRanks.mockResolvedValue([]);
    mockGameLookup.mockResolvedValue(null);
  });

  it('rejects a malformed game id without touching auth', async () => {
    const result = await claimSharedGameAction('not-a-uuid', TOKEN);

    expect(result).toEqual({ success: false, error: 'invalid_input' });
    expect(mockGuard).not.toHaveBeenCalled();
  });

  it('rejects an empty token', async () => {
    const result = await claimSharedGameAction(GAME_ID, '');

    expect(result).toEqual({ success: false, error: 'invalid_input' });
    expect(mockGuard).not.toHaveBeenCalled();
  });

  it('propagates guard errors (signed out / banned / no profile)', async () => {
    mockGuard.mockResolvedValue({ error: 'profileRequired' });

    const result = await claimSharedGameAction(GAME_ID, TOKEN);

    expect(result).toEqual({ success: false, error: 'profileRequired' });
    expect(mockClaim).not.toHaveBeenCalled();
  });

  it('authorizes via the token ONLY — never via the session author path', async () => {
    await claimSharedGameAction(GAME_ID, TOKEN);

    expect(mockAuthorize).toHaveBeenCalledWith({ gameId: GAME_ID, userId: null, token: TOKEN });
  });

  it('rejects a bad token as forbidden without claiming', async () => {
    mockAuthorize.mockResolvedValue('forbidden');

    const result = await claimSharedGameAction(GAME_ID, TOKEN);

    expect(result).toEqual({ success: false, error: 'forbidden' });
    expect(mockClaim).not.toHaveBeenCalled();
  });

  it('maps a cross-device double claim (token row already gone, game has an author) to already_claimed', async () => {
    mockAuthorize.mockResolvedValue('forbidden');
    mockGameLookup.mockResolvedValue('someone-else');

    const result = await claimSharedGameAction(GAME_ID, TOKEN);

    expect(result).toEqual({ success: false, error: 'already_claimed' });
    expect(mockClaim).not.toHaveBeenCalled();
  });

  it('keeps forbidden for a genuinely wrong token on a still-authorless game', async () => {
    mockAuthorize.mockResolvedValue('forbidden');
    mockGameLookup.mockResolvedValue(null);

    const result = await claimSharedGameAction(GAME_ID, TOKEN);

    expect(result).toEqual({ success: false, error: 'forbidden' });
    expect(mockClaim).not.toHaveBeenCalled();
  });

  it('maps a lost claim race to already_claimed and skips rank evaluation', async () => {
    mockClaim.mockResolvedValue(false);

    const result = await claimSharedGameAction(GAME_ID, TOKEN);

    expect(result).toEqual({ success: false, error: 'already_claimed' });
    expect(mockEvaluateRanks).not.toHaveBeenCalled();
  });

  it('re-evaluates ranks on success and surfaces the grants', async () => {
    const granted = [{ slug: '1kyu', level: 50, color: 'brown' }];
    mockEvaluateRanks.mockResolvedValue(granted);

    const result = await claimSharedGameAction(GAME_ID, TOKEN);

    expect(mockClaim).toHaveBeenCalledWith(GAME_ID, USER_ID);
    expect(mockEvaluateRanks).toHaveBeenCalledWith(USER_ID, 'game claim');
    expect(mockCookieRefresh).toHaveBeenCalledWith(granted);
    expect(result).toEqual({ success: true, grantedRanks: granted });
  });

  it('omits grantedRanks when nothing was granted (e.g. a non-qualifying game)', async () => {
    const result = await claimSharedGameAction(GAME_ID, TOKEN);

    expect(result).toEqual({ success: true });
  });
});
