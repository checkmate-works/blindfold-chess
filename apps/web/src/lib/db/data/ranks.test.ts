import { describe, expect, it } from 'vitest';

import {
  ALL_RANK_SLUGS,
  BELT_COLOR_HEX,
  RANK_COLORS,
  isChallengeScoreRequirement,
  isGamePublishWinRequirement,
  isMukyuSlug,
  isPositionSubmissionCountRequirement,
  parseRequirements,
  ranksSeedData,
} from './ranks';
import type { ChallengeScoreRequirement, PositionSubmissionCountRequirement } from './ranks';

// ---------------------------------------------------------------------------
// isChallengeScoreRequirement
// ---------------------------------------------------------------------------

describe('isChallengeScoreRequirement', () => {
  const validReq: ChallengeScoreRequirement = {
    type: 'challenge_score',
    menuType: 'coordinate_quiz',
    leaderboardKey: 'white',
    minScore: 20,
  };

  it('should return true for a valid ChallengeScoreRequirement', () => {
    expect(isChallengeScoreRequirement(validReq)).toBe(true);
  });

  it('should return false for null', () => {
    expect(isChallengeScoreRequirement(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isChallengeScoreRequirement(undefined)).toBe(false);
  });

  it('should return false for a string', () => {
    expect(isChallengeScoreRequirement('challenge_score')).toBe(false);
  });

  it('should return false for a number', () => {
    expect(isChallengeScoreRequirement(42)).toBe(false);
  });

  it('should return false for an empty object', () => {
    expect(isChallengeScoreRequirement({})).toBe(false);
  });

  it('should return false when type is wrong', () => {
    expect(isChallengeScoreRequirement({ ...validReq, type: 'post_count' })).toBe(false);
  });

  it('should return false when type is missing', () => {
    const { type, ...rest } = validReq;
    void type;
    expect(isChallengeScoreRequirement(rest)).toBe(false);
  });

  it('should return false when menuType is missing', () => {
    const { menuType, ...rest } = validReq;
    void menuType;
    expect(isChallengeScoreRequirement(rest)).toBe(false);
  });

  it('should return false when menuType is not a string', () => {
    expect(isChallengeScoreRequirement({ ...validReq, menuType: 123 })).toBe(false);
  });

  it('should return false when leaderboardKey is missing', () => {
    const { leaderboardKey, ...rest } = validReq;
    void leaderboardKey;
    expect(isChallengeScoreRequirement(rest)).toBe(false);
  });

  it('should return false when leaderboardKey is not a string', () => {
    expect(isChallengeScoreRequirement({ ...validReq, leaderboardKey: true })).toBe(false);
  });

  it('should return false when minScore is missing', () => {
    const { minScore, ...rest } = validReq;
    void minScore;
    expect(isChallengeScoreRequirement(rest)).toBe(false);
  });

  it('should return false when minScore is not a number', () => {
    expect(isChallengeScoreRequirement({ ...validReq, minScore: '20' })).toBe(false);
  });

  it('should return true when extra properties are present', () => {
    expect(isChallengeScoreRequirement({ ...validReq, extra: 'field' })).toBe(true);
  });

  it('should return true for minScore of 0', () => {
    expect(isChallengeScoreRequirement({ ...validReq, minScore: 0 })).toBe(true);
  });

  it('should return true for negative minScore', () => {
    expect(isChallengeScoreRequirement({ ...validReq, minScore: -1 })).toBe(true);
  });

  it('should return false for an array', () => {
    expect(isChallengeScoreRequirement([validReq])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isPositionSubmissionCountRequirement
// ---------------------------------------------------------------------------

describe('isPositionSubmissionCountRequirement', () => {
  const validReq: PositionSubmissionCountRequirement = {
    type: 'position_submission_count',
    positionTypes: ['memory'],
    minCount: 1,
  };

  it('should return true for a valid single-type requirement', () => {
    expect(isPositionSubmissionCountRequirement(validReq)).toBe(true);
  });

  it('should return true for a valid multi-type requirement', () => {
    expect(
      isPositionSubmissionCountRequirement({ ...validReq, positionTypes: ['memory', 'puzzle'] })
    ).toBe(true);
  });

  it('should return false for null', () => {
    expect(isPositionSubmissionCountRequirement(null)).toBe(false);
  });

  it('should return false when type is wrong', () => {
    expect(isPositionSubmissionCountRequirement({ ...validReq, type: 'challenge_score' })).toBe(
      false
    );
  });

  it('should return false when positionTypes is not an array', () => {
    expect(isPositionSubmissionCountRequirement({ ...validReq, positionTypes: 'memory' })).toBe(
      false
    );
  });

  it('should return false when positionTypes is an empty array', () => {
    expect(isPositionSubmissionCountRequirement({ ...validReq, positionTypes: [] })).toBe(false);
  });

  it('should return false when positionTypes contains an unknown value', () => {
    expect(
      isPositionSubmissionCountRequirement({ ...validReq, positionTypes: ['memory', 'bogus'] })
    ).toBe(false);
  });

  it('should return false when minCount is missing', () => {
    const { minCount, ...rest } = validReq;
    void minCount;
    expect(isPositionSubmissionCountRequirement(rest)).toBe(false);
  });

  it('should return false when minCount is not a number', () => {
    expect(isPositionSubmissionCountRequirement({ ...validReq, minCount: '1' })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// parseRequirements
// ---------------------------------------------------------------------------

describe('parseRequirements', () => {
  const validReq: ChallengeScoreRequirement = {
    type: 'challenge_score',
    menuType: 'square_colors',
    leaderboardKey: 'default',
    minScore: 15,
  };

  it('should return an empty array for null input', () => {
    expect(parseRequirements(null)).toEqual([]);
  });

  it('should return an empty array for undefined input', () => {
    expect(parseRequirements(undefined)).toEqual([]);
  });

  it('should return an empty array for a string input', () => {
    expect(parseRequirements('not an array')).toEqual([]);
  });

  it('should return an empty array for a number input', () => {
    expect(parseRequirements(42)).toEqual([]);
  });

  it('should return an empty array for an object input', () => {
    expect(parseRequirements({ type: 'challenge_score' })).toEqual([]);
  });

  it('should return an empty array for an empty array', () => {
    expect(parseRequirements([])).toEqual([]);
  });

  it('should parse a single valid requirement', () => {
    expect(parseRequirements([validReq])).toEqual([validReq]);
  });

  it('should parse multiple valid requirements', () => {
    const req2: ChallengeScoreRequirement = {
      type: 'challenge_score',
      menuType: 'coordinate_quiz',
      leaderboardKey: 'white',
      minScore: 20,
    };
    expect(parseRequirements([validReq, req2])).toEqual([validReq, req2]);
  });

  it('should filter out invalid entries from the array', () => {
    expect(parseRequirements([validReq, { type: 'unknown' }, null, 42, validReq])).toEqual([
      validReq,
      validReq,
    ]);
  });

  it('should return an empty array when all entries are invalid', () => {
    expect(parseRequirements([null, undefined, 'bad', { type: 'nope' }])).toEqual([]);
  });

  it('should handle JSONB-like data (parsed JSON array)', () => {
    const raw = JSON.parse(JSON.stringify([validReq]));
    expect(parseRequirements(raw)).toEqual([validReq]);
  });
});

// ---------------------------------------------------------------------------
// Exported constants sanity checks
// ---------------------------------------------------------------------------

describe('ALL_RANK_SLUGS', () => {
  it('should contain 7 ranks', () => {
    expect(ALL_RANK_SLUGS).toHaveLength(7);
  });

  it('should start with mukyu and end with 1dan', () => {
    expect(ALL_RANK_SLUGS[0]).toBe('mukyu');
    expect(ALL_RANK_SLUGS[ALL_RANK_SLUGS.length - 1]).toBe('1dan');
  });
});

describe('RANK_COLORS', () => {
  it('should have a color for every rank slug', () => {
    for (const slug of ALL_RANK_SLUGS) {
      expect(RANK_COLORS[slug]).toBeDefined();
      expect(typeof RANK_COLORS[slug]).toBe('string');
    }
  });
});

describe('BELT_COLOR_HEX', () => {
  it('should have a hex value for every color used in RANK_COLORS', () => {
    const colors = new Set(Object.values(RANK_COLORS));
    for (const color of colors) {
      expect(BELT_COLOR_HEX[color]).toBeDefined();
      expect(BELT_COLOR_HEX[color]).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('should include white for mukyu', () => {
    expect(BELT_COLOR_HEX['white']).toBe('#ffffff');
  });
});

// ---------------------------------------------------------------------------
// ranksSeedData – 4kyu entry
// ---------------------------------------------------------------------------

describe('ranksSeedData – 4kyu', () => {
  const entry4kyu = ranksSeedData.find((r) => r.slug === '4kyu');

  it('should exist in ranksSeedData', () => {
    expect(entry4kyu).toBeDefined();
  });

  it('should have exactly 3 requirements', () => {
    expect(entry4kyu!.requirements).toHaveLength(3);
  });

  it('should have king as the first requirement with minScore 20', () => {
    const firstReq = entry4kyu!.requirements[0];
    expect(firstReq.type).toBe('challenge_score');
    if (firstReq.type !== 'challenge_score') return;
    expect(firstReq.menuType).toBe('legal_moves');
    expect(firstReq.leaderboardKey).toBe('king');
    expect(firstReq.minScore).toBe(20);
  });

  it('should have knight as the second requirement with minScore 20', () => {
    const secondReq = entry4kyu!.requirements[1];
    expect(secondReq.type).toBe('challenge_score');
    if (secondReq.type !== 'challenge_score') return;
    expect(secondReq.menuType).toBe('legal_moves');
    expect(secondReq.leaderboardKey).toBe('knight');
    expect(secondReq.minScore).toBe(20);
  });

  it('should have bishop as the third requirement with minScore 10', () => {
    const thirdReq = entry4kyu!.requirements[2];
    expect(thirdReq.type).toBe('challenge_score');
    if (thirdReq.type !== 'challenge_score') return;
    expect(thirdReq.menuType).toBe('legal_moves');
    expect(thirdReq.leaderboardKey).toBe('bishop');
    expect(thirdReq.minScore).toBe(10);
  });

  it('should have level 20 and blue color', () => {
    expect(entry4kyu!.level).toBe(20);
    expect(entry4kyu!.color).toBe(RANK_COLORS['4kyu']);
  });
});

// ---------------------------------------------------------------------------
// ranksSeedData – 2kyu
// ---------------------------------------------------------------------------

describe('ranksSeedData – 2kyu', () => {
  const entry2kyu = ranksSeedData.find((r) => r.slug === '2kyu');

  it('should exist in ranksSeedData', () => {
    expect(entry2kyu).toBeDefined();
  });

  it('should have exactly 1 requirement satisfiable by either memory or puzzle posts', () => {
    expect(entry2kyu!.requirements).toHaveLength(1);
    const req = entry2kyu!.requirements[0];
    expect(req.type).toBe('position_submission_count');
    if (req.type !== 'position_submission_count') return;
    expect(req.positionTypes).toEqual(['memory', 'puzzle']);
    expect(req.minCount).toBe(1);
  });

  it('should have level 40 and green color', () => {
    expect(entry2kyu!.level).toBe(40);
    expect(entry2kyu!.color).toBe(RANK_COLORS['2kyu']);
  });
});

// ---------------------------------------------------------------------------
// isGamePublishWinRequirement / 1kyu seed
// ---------------------------------------------------------------------------

describe('isGamePublishWinRequirement', () => {
  it('should return true for a valid GamePublishWinRequirement', () => {
    expect(isGamePublishWinRequirement({ type: 'game_publish_win', minCount: 1 })).toBe(true);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a string', 'game_publish_win'],
    ['an empty object', {}],
    ['a wrong type tag', { type: 'challenge_score', minCount: 1 }],
    ['a missing minCount', { type: 'game_publish_win' }],
    ['a non-numeric minCount', { type: 'game_publish_win', minCount: '1' }],
  ])('should return false for %s', (_label, value) => {
    expect(isGamePublishWinRequirement(value)).toBe(false);
  });
});

describe('1kyu seed', () => {
  const entry1kyu = ranksSeedData.find((r) => r.slug === '1kyu');

  it('requires one published, constrained win', () => {
    expect(entry1kyu).toBeDefined();
    expect(entry1kyu!.requirements).toHaveLength(1);
    const [req] = entry1kyu!.requirements;
    expect(req.type).toBe('game_publish_win');
    if (req.type !== 'game_publish_win') return;
    expect(req.minCount).toBe(1);
  });

  it('parses its seeded requirements back out — the guard and the seed agree', () => {
    // `parseRequirements` DROPS requirements it does not recognise rather than
    // failing, and an empty list reads as "conditions not defined yet" — which
    // makes the rank Coming Soon and lets the progression walk straight past it.
    // So a seed whose type guard was never added would silently un-gate 1kyu
    // instead of erroring. This pins the two together.
    expect(parseRequirements(entry1kyu!.requirements)).toEqual(entry1kyu!.requirements);
  });

  it('is no longer a "Coming Soon" rank', () => {
    expect(parseRequirements(entry1kyu!.requirements).length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// isMukyuSlug
// ---------------------------------------------------------------------------

describe('isMukyuSlug', () => {
  it('should return true for "mukyu"', () => {
    expect(isMukyuSlug('mukyu')).toBe(true);
  });

  it('should return false for other rank slugs', () => {
    expect(isMukyuSlug('5kyu')).toBe(false);
    expect(isMukyuSlug('1dan')).toBe(false);
  });

  it('should return false for arbitrary strings', () => {
    expect(isMukyuSlug('unknown')).toBe(false);
    expect(isMukyuSlug('')).toBe(false);
  });
});
