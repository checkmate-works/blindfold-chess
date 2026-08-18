import { revalidateTag } from 'next/cache';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { isUserBanned as mockIsUserBanned } from '@/lib/moderation/__mocks__/ban';
import { getUserMock as mockGetUser } from '@/lib/supabase/__mocks__/server';

import type { SaveResultResponse } from '../_lib/save-result-response';
import { savePracticeResult } from './save-practice-result';

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

const mockCheckRateLimit = vi.fn();
const mockSaveChallengeResult = vi.fn();
const mockDeriveLeaderboardKey = vi.fn();

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('@/lib/supabase/server');

vi.mock('@/lib/moderation/ban');

vi.mock('@/lib/security/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  RATE_LIMITS: {
    savePracticeResult: { maxAttempts: 10, windowMs: 60_000 },
  },
}));

vi.mock('@/lib/db/save-challenge-result', () => ({
  saveChallengeResult: (...args: unknown[]) => mockSaveChallengeResult(...args),
}));

vi.mock('@/lib/db/leaderboard-key', () => ({
  deriveLeaderboardKey: (...args: unknown[]) => mockDeriveLeaderboardKey(...args),
}));

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const testUserId = 'user-00000000-0000-0000-0000-000000000001';

const validChallengeFields = {
  score: 25,
  incorrectAnswers: 3,
  timeTaken: 45,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('savePracticeResult', () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(false);
    mockCheckRateLimit.mockResolvedValue({ success: true });
    mockDeriveLeaderboardKey.mockReturnValue('white');
    mockSaveChallengeResult.mockResolvedValue({
      grantedRanks: [],
      exp: { earnedExp: 10, totalExp: 100, level: 2, levelUp: false },
      challengeResultId: 'cr-00000000-0000-0000-0000-000000000001',
    });
  });

  // -------------------------------------------------------------------------
  // Success case
  // -------------------------------------------------------------------------

  it('should return { success: true } on successful save', async () => {
    const result = await savePracticeResult(
      'coordinate_quiz',
      { boardOrientation: 'white' },
      validChallengeFields
    );

    expect(result).toEqual({
      success: true,
      grantedRanks: [],
      challengeResultId: 'cr-00000000-0000-0000-0000-000000000001',
    });
  });

  it('should call saveChallengeResult with rounded values', async () => {
    await savePracticeResult(
      'coordinate_quiz',
      { boardOrientation: 'white' },
      { score: 25.7, incorrectAnswers: 3.2, timeTaken: 45.9 }
    );

    expect(mockSaveChallengeResult).toHaveBeenCalledWith({
      userId: testUserId,
      menuType: 'coordinate_quiz',
      leaderboardKey: 'white',
      score: 26,
      incorrectAnswers: 3,
      timeTaken: 46,
    });
  });

  // -------------------------------------------------------------------------
  // Cache revalidation
  // -------------------------------------------------------------------------

  it('revalidates both leaderboard and exp-leaderboard tags on successful save', async () => {
    await savePracticeResult(
      'coordinate_quiz',
      { boardOrientation: 'white' },
      validChallengeFields
    );

    expect(revalidateTag).toHaveBeenCalledWith('leaderboard', { expire: 0 });
    expect(revalidateTag).toHaveBeenCalledWith('exp-leaderboard', { expire: 0 });
    expect(revalidateTag).toHaveBeenCalledTimes(2);
  });

  it('does not revalidate cache tags when user is banned', async () => {
    mockIsUserBanned.mockResolvedValue(true);

    await savePracticeResult(
      'coordinate_quiz',
      { boardOrientation: 'white' },
      validChallengeFields
    );

    expect(revalidateTag).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Auth failure
  // -------------------------------------------------------------------------

  it('should return { success: false, error: "signInRequired" } when user is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await savePracticeResult(
      'coordinate_quiz',
      { boardOrientation: 'white' },
      validChallengeFields
    );

    expect(result).toEqual({ success: false, error: 'signInRequired' });
  });

  it('should not call saveChallengeResult when user is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await savePracticeResult(
      'coordinate_quiz',
      { boardOrientation: 'white' },
      validChallengeFields
    );

    expect(mockSaveChallengeResult).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Banned user
  // -------------------------------------------------------------------------

  it('should return { success: false, error: "banned" } when user is banned', async () => {
    mockIsUserBanned.mockResolvedValue(true);

    const result = await savePracticeResult(
      'coordinate_quiz',
      { boardOrientation: 'white' },
      validChallengeFields
    );

    expect(result).toEqual({ success: false, error: 'banned' });
  });

  // -------------------------------------------------------------------------
  // Rate limiting
  // -------------------------------------------------------------------------

  it('should return { success: false, error: "rateLimited" } when rate limited', async () => {
    mockCheckRateLimit.mockResolvedValue({ error: 'rateLimited' });

    const result = await savePracticeResult(
      'coordinate_quiz',
      { boardOrientation: 'white' },
      validChallengeFields
    );

    expect(result).toEqual({ success: false, error: 'rateLimited' });
  });

  // -------------------------------------------------------------------------
  // Invalid menu type
  // -------------------------------------------------------------------------

  it('should return { success: false, error: "invalid_menu_type" } for unknown menu type', async () => {
    const result = await savePracticeResult('nonexistent_type' as never, {}, validChallengeFields);

    expect(result).toEqual({ success: false, error: 'invalid_menu_type' });
  });

  // -------------------------------------------------------------------------
  // Invalid leaderboard key
  // -------------------------------------------------------------------------

  it('should return { success: false, error: "invalid_leaderboard_key" } when key is null', async () => {
    mockDeriveLeaderboardKey.mockReturnValue(null);

    const result = await savePracticeResult(
      'coordinate_quiz',
      { boardOrientation: 123 },
      validChallengeFields
    );

    expect(result).toEqual({ success: false, error: 'invalid_leaderboard_key' });
  });

  // -------------------------------------------------------------------------
  // Unexpected error
  // -------------------------------------------------------------------------

  it('should return { success: false, error: "unexpected_error" } when saveChallengeResult throws', async () => {
    mockSaveChallengeResult.mockRejectedValue(new Error('DB connection lost'));

    const result = await savePracticeResult(
      'coordinate_quiz',
      { boardOrientation: 'white' },
      validChallengeFields
    );

    expect(result).toEqual({ success: false, error: 'unexpected_error' });
  });

  // -------------------------------------------------------------------------
  // Response type conformance
  // -------------------------------------------------------------------------

  it('should conform to SaveResultResponse type for success', async () => {
    const result: SaveResultResponse = await savePracticeResult(
      'coordinate_quiz',
      { boardOrientation: 'white' },
      validChallengeFields
    );

    expect(result.success).toBe(true);
    if (result.success) {
      // Type narrowing: success case should not have error field
      expect(result).not.toHaveProperty('error');
    }
  });

  it('should conform to SaveResultResponse type for failure', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result: SaveResultResponse = await savePracticeResult(
      'coordinate_quiz',
      { boardOrientation: 'white' },
      validChallengeFields
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      // Type narrowing: failure case should have error string
      expect(typeof result.error).toBe('string');
      expect(result.error.length).toBeGreaterThan(0);
    }
  });

  // -------------------------------------------------------------------------
  // Different menu types
  // -------------------------------------------------------------------------

  it('should work with legal_moves menu type', async () => {
    mockDeriveLeaderboardKey.mockReturnValue('knight');

    const result = await savePracticeResult(
      'legal_moves',
      { selectedPiece: 'knight' },
      validChallengeFields
    );

    expect(result).toEqual({
      success: true,
      grantedRanks: [],
      challengeResultId: 'cr-00000000-0000-0000-0000-000000000001',
    });
    expect(mockSaveChallengeResult).toHaveBeenCalledWith(
      expect.objectContaining({
        menuType: 'legal_moves',
        leaderboardKey: 'knight',
      })
    );
  });

  it('should work with square_colors menu type', async () => {
    mockDeriveLeaderboardKey.mockReturnValue('default');

    const result = await savePracticeResult('square_colors', {}, validChallengeFields);

    expect(result).toEqual({
      success: true,
      grantedRanks: [],
      challengeResultId: 'cr-00000000-0000-0000-0000-000000000001',
    });
    expect(mockSaveChallengeResult).toHaveBeenCalledWith(
      expect.objectContaining({
        menuType: 'square_colors',
        leaderboardKey: 'default',
      })
    );
  });
});
