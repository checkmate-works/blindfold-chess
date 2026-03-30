import { describe, expect, it } from 'vitest';

import { BELT_COLOR_HEX, RANK_COLORS } from '@/lib/db/data/ranks';
import type { ChallengeScoreRequirement, RankSlug } from '@/lib/db/data/ranks';

import { buildChallengeNameKey, getBeltColorHex, getRankCardState } from './helpers';

// ---------------------------------------------------------------------------
// buildChallengeNameKey
// ---------------------------------------------------------------------------

describe('buildChallengeNameKey', () => {
  it('should return menuType alone when leaderboardKey is "default"', () => {
    const req: ChallengeScoreRequirement = {
      type: 'challenge_score',
      menuType: 'square_colors',
      leaderboardKey: 'default',
      minScore: 15,
    };
    expect(buildChallengeNameKey(req)).toBe('square_colors');
  });

  it('should return menuType_leaderboardKey when leaderboardKey is not "default"', () => {
    const req: ChallengeScoreRequirement = {
      type: 'challenge_score',
      menuType: 'coordinate_quiz',
      leaderboardKey: 'white',
      minScore: 20,
    };
    expect(buildChallengeNameKey(req)).toBe('coordinate_quiz_white');
  });

  it('should handle an empty string leaderboardKey (not "default")', () => {
    const req: ChallengeScoreRequirement = {
      type: 'challenge_score',
      menuType: 'coordinate_quiz',
      leaderboardKey: '',
      minScore: 10,
    };
    expect(buildChallengeNameKey(req)).toBe('coordinate_quiz_');
  });
});

// ---------------------------------------------------------------------------
// getBeltColorHex
// ---------------------------------------------------------------------------

describe('getBeltColorHex', () => {
  it('should return the correct hex for each known rank slug', () => {
    const expected: Record<RankSlug, string> = {
      '5kyu': BELT_COLOR_HEX[RANK_COLORS['5kyu']],
      '4kyu': BELT_COLOR_HEX[RANK_COLORS['4kyu']],
      '3kyu': BELT_COLOR_HEX[RANK_COLORS['3kyu']],
      '2kyu': BELT_COLOR_HEX[RANK_COLORS['2kyu']],
      '1kyu': BELT_COLOR_HEX[RANK_COLORS['1kyu']],
      '1dan': BELT_COLOR_HEX[RANK_COLORS['1dan']],
    };
    for (const [slug, hex] of Object.entries(expected)) {
      expect(getBeltColorHex(slug as RankSlug)).toBe(hex);
    }
  });

  it('should return fallback gray for an unknown slug', () => {
    // Force an unknown slug that has no matching color name
    const unknownSlug = 'unknown_rank' as RankSlug;
    // RANK_COLORS won't have this key, so colorName is undefined
    // BELT_COLOR_HEX[undefined] is undefined, so fallback '#6b7280' is returned
    expect(getBeltColorHex(unknownSlug)).toBe('#6b7280');
  });
});

// ---------------------------------------------------------------------------
// getRankCardState
// ---------------------------------------------------------------------------

describe('getRankCardState', () => {
  // Common arguments helper
  const call = (overrides: {
    inDb?: boolean;
    requirements?: ChallengeScoreRequirement[];
    isAchieved?: boolean;
    previousAchieved?: boolean;
    isLoggedIn?: boolean;
    isFirstRank?: boolean;
  }) => {
    const defaults = {
      inDb: true,
      requirements: [
        {
          type: 'challenge_score' as const,
          menuType: 'square_colors',
          leaderboardKey: 'default',
          minScore: 15,
        },
      ],
      isAchieved: false,
      previousAchieved: false,
      isLoggedIn: true,
      isFirstRank: false,
    };
    const args = { ...defaults, ...overrides };
    return getRankCardState(
      args.inDb,
      args.requirements,
      args.isAchieved,
      args.previousAchieved,
      args.isLoggedIn,
      args.isFirstRank
    );
  };

  // --- "coming-soon" states ---

  it('should return "coming-soon" when rank is not in DB', () => {
    expect(call({ inDb: false })).toBe('coming-soon');
  });

  it('should return "coming-soon" when requirements array is empty', () => {
    expect(call({ requirements: [] })).toBe('coming-soon');
  });

  it('should return "coming-soon" when not in DB even if achieved', () => {
    expect(call({ inDb: false, isAchieved: true })).toBe('coming-soon');
  });

  // --- Logged-in states ---

  it('should return "achieved" when logged in and rank is achieved', () => {
    expect(call({ isAchieved: true })).toBe('achieved');
  });

  it('should return "next" when logged in, not achieved, and is first rank', () => {
    expect(call({ isFirstRank: true })).toBe('next');
  });

  it('should return "next" when logged in, not achieved, and previous rank is achieved', () => {
    expect(call({ previousAchieved: true })).toBe('next');
  });

  it('should return "locked" when logged in, not achieved, not first, and previous not achieved', () => {
    expect(call({})).toBe('locked');
  });

  it('should return "next" when both isFirstRank and previousAchieved are true', () => {
    expect(call({ isFirstRank: true, previousAchieved: true })).toBe('next');
  });

  // --- Logged-out states ---

  it('should return "next" when not logged in and is first rank', () => {
    expect(call({ isLoggedIn: false, isFirstRank: true })).toBe('next');
  });

  it('should return "locked" when not logged in and is not first rank', () => {
    expect(call({ isLoggedIn: false })).toBe('locked');
  });

  it('should return "locked" when not logged in even if previousAchieved is true (impossible but safe)', () => {
    expect(call({ isLoggedIn: false, previousAchieved: true })).toBe('locked');
  });

  // --- Priority checks ---

  it('"coming-soon" (not in DB) takes priority over logged-in achieved state', () => {
    expect(call({ inDb: false, isAchieved: true, isLoggedIn: true })).toBe('coming-soon');
  });

  it('"coming-soon" (empty requirements) takes priority over logged-in achieved state', () => {
    expect(call({ requirements: [], isAchieved: true, isLoggedIn: true })).toBe('coming-soon');
  });
});
