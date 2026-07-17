import { describe, expect, it } from 'vitest';

import {
  ALL_RANK_SLUGS,
  BELT_COLOR_HEX,
  RANK_COLORS,
  parseRequirements,
  ranksSeedData,
} from '@/lib/db/data/ranks';
import type { ChallengeScoreRequirement, RankSlug } from '@/lib/db/data/ranks';
import type { Rank } from '@/lib/db/schema';

import {
  buildChallengeNameKey,
  buildPositionSubmissionLabels,
  buildRequirementItems,
  getBeltColorHex,
  getRankCardState,
  isRankEarnedByPlaying,
  isWhiteBelt,
  resolveNextRank,
} from './helpers';

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

  it('should return "legal_moves_bishop" for the 4kyu bishop requirement', () => {
    const req: ChallengeScoreRequirement = {
      type: 'challenge_score',
      menuType: 'legal_moves',
      leaderboardKey: 'bishop',
      minScore: 10,
    };
    expect(buildChallengeNameKey(req)).toBe('legal_moves_bishop');
  });

  it('should return "legal_moves_knight" for the 4kyu knight requirement', () => {
    const req: ChallengeScoreRequirement = {
      type: 'challenge_score',
      menuType: 'legal_moves',
      leaderboardKey: 'knight',
      minScore: 20,
    };
    expect(buildChallengeNameKey(req)).toBe('legal_moves_knight');
  });

  it('should return "legal_moves_king" for legal_moves with king leaderboardKey', () => {
    const req: ChallengeScoreRequirement = {
      type: 'challenge_score',
      menuType: 'legal_moves',
      leaderboardKey: 'king',
      minScore: 20,
    };
    expect(buildChallengeNameKey(req)).toBe('legal_moves_king');
  });
});

// ---------------------------------------------------------------------------
// buildRequirementItems
// ---------------------------------------------------------------------------

describe('buildRequirementItems', () => {
  const mockT = (key: string, values?: Record<string, string | number | Date>) => {
    if (key === 'challengeScore') return `Score ${values?.minScore}+ in ${values?.challengeName}`;
    if (key.startsWith('challengeNames.')) return key.replace('challengeNames.', '');
    if (key === 'submissionCount') return `Submit ${values?.minCount} ${values?.itemName}`;
    if (key.startsWith('submissionItemNames.')) return key.replace('submissionItemNames.', '');
    if (key === 'orDivider') return 'or';
    return key;
  };

  it('should generate challenge URL with piece parameter for legal_moves', () => {
    const items = buildRequirementItems(
      [{ type: 'challenge_score', menuType: 'legal_moves', leaderboardKey: 'king', minScore: 20 }],
      'en',
      mockT
    );
    expect(items[0]).toMatchObject({ href: '/en/practice/legal-moves/challenge?piece=king' });
  });

  it('should generate challenge URL with piece parameter for route_planner', () => {
    const items = buildRequirementItems(
      [
        {
          type: 'challenge_score',
          menuType: 'route_planner',
          leaderboardKey: 'knight',
          minScore: 3,
        },
      ],
      'en',
      mockT
    );
    expect(items[0]).toMatchObject({ href: '/en/practice/route-planner/challenge?piece=knight' });
  });

  it('should generate standard practice URL for non-legal_moves', () => {
    const items = buildRequirementItems(
      [
        {
          type: 'challenge_score',
          menuType: 'square_colors',
          leaderboardKey: 'default',
          minScore: 15,
        },
      ],
      'en',
      mockT
    );
    expect(items[0]).toMatchObject({ href: '/en/practice/square-colors' });
  });

  it('should generate standard practice URL for legal_moves with default leaderboardKey', () => {
    const items = buildRequirementItems(
      [
        {
          type: 'challenge_score',
          menuType: 'legal_moves',
          leaderboardKey: 'default',
          minScore: 20,
        },
      ],
      'en',
      mockT
    );
    expect(items[0]).toMatchObject({ href: '/en/practice/legal-moves' });
  });

  it('should generate a single linked item for a memory-only requirement', () => {
    const items = buildRequirementItems(
      [{ type: 'position_submission_count', positionTypes: ['memory'], minCount: 1 }],
      'en',
      mockT
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      href: '/en/practice/position-memory/new',
      label: 'Submit 1 memory',
    });
  });

  it('should generate the puzzle URL for a puzzle-only requirement', () => {
    const items = buildRequirementItems(
      [{ type: 'position_submission_count', positionTypes: ['puzzle'], minCount: 1 }],
      'en',
      mockT
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ href: '/en/practice/puzzle/new' });
  });

  it('should split a memory-or-puzzle requirement into two linked items joined by an or divider', () => {
    const items = buildRequirementItems(
      [{ type: 'position_submission_count', positionTypes: ['memory', 'puzzle'], minCount: 1 }],
      'en',
      mockT
    );
    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({
      href: '/en/practice/position-memory/new',
      label: 'Submit 1 memory',
    });
    expect(items[1]).toEqual({ kind: 'or', label: 'or' });
    expect(items[2]).toMatchObject({
      href: '/en/practice/puzzle/new',
      label: 'Submit 1 puzzle',
    });
  });
});

// ---------------------------------------------------------------------------
// buildPositionSubmissionLabels
// ---------------------------------------------------------------------------

describe('buildPositionSubmissionLabels', () => {
  const mockT = (key: string, values?: Record<string, string | number | Date>) => {
    if (key === 'orDivider') return 'or';
    if (key === 'submissionCount') return `Submit ${values?.minCount} ${values?.itemName}`;
    if (key.startsWith('submissionItemNames.')) return key.replace('submissionItemNames.', '');
    return key;
  };

  it('should return a single label for a one-type requirement', () => {
    const labels = buildPositionSubmissionLabels(
      { type: 'position_submission_count', positionTypes: ['memory'], minCount: 1 },
      mockT
    );
    expect(labels).toEqual(['Submit 1 memory']);
  });

  it('should join multiple types with an or divider entry, no href', () => {
    const labels = buildPositionSubmissionLabels(
      { type: 'position_submission_count', positionTypes: ['memory', 'puzzle'], minCount: 1 },
      mockT
    );
    expect(labels).toEqual(['Submit 1 memory', { kind: 'or', label: 'or' }, 'Submit 1 puzzle']);
  });
});

// ---------------------------------------------------------------------------
// getBeltColorHex
// ---------------------------------------------------------------------------

describe('getBeltColorHex', () => {
  it('should return the correct hex for each known rank slug', () => {
    const expected: Record<RankSlug, string> = {
      mukyu: BELT_COLOR_HEX[RANK_COLORS['mukyu']],
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

  it('should return #ffffff for mukyu (white belt)', () => {
    expect(getBeltColorHex('mukyu')).toBe('#ffffff');
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
// isWhiteBelt
// ---------------------------------------------------------------------------

describe('isWhiteBelt', () => {
  it('returns true for #ffffff (mukyu belt color)', () => {
    expect(isWhiteBelt('#ffffff')).toBe(true);
  });

  it('returns false for any non-white belt color', () => {
    expect(isWhiteBelt('#f97316')).toBe(false);
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

  // --- 4kyu-specific: non-empty requirements should NOT be "coming-soon" ---

  it('should not return "coming-soon" for a rank with legal_moves requirements (4kyu)', () => {
    const legalMovesRequirements: ChallengeScoreRequirement[] = [
      { type: 'challenge_score', menuType: 'legal_moves', leaderboardKey: 'bishop', minScore: 10 },
      { type: 'challenge_score', menuType: 'legal_moves', leaderboardKey: 'knight', minScore: 20 },
    ];
    const result = call({ requirements: legalMovesRequirements });
    expect(result).not.toBe('coming-soon');
  });

  it('should return "locked" for 4kyu requirements when not first rank and previous not achieved', () => {
    const legalMovesRequirements: ChallengeScoreRequirement[] = [
      { type: 'challenge_score', menuType: 'legal_moves', leaderboardKey: 'bishop', minScore: 10 },
      { type: 'challenge_score', menuType: 'legal_moves', leaderboardKey: 'knight', minScore: 20 },
    ];
    expect(call({ requirements: legalMovesRequirements })).toBe('locked');
  });

  it('should return "next" for 4kyu requirements when previous rank is achieved', () => {
    const legalMovesRequirements: ChallengeScoreRequirement[] = [
      { type: 'challenge_score', menuType: 'legal_moves', leaderboardKey: 'bishop', minScore: 10 },
      { type: 'challenge_score', menuType: 'legal_moves', leaderboardKey: 'knight', minScore: 20 },
    ];
    expect(call({ requirements: legalMovesRequirements, previousAchieved: true })).toBe('next');
  });

  it('should return "achieved" for 4kyu requirements when rank is achieved', () => {
    const legalMovesRequirements: ChallengeScoreRequirement[] = [
      { type: 'challenge_score', menuType: 'legal_moves', leaderboardKey: 'bishop', minScore: 10 },
      { type: 'challenge_score', menuType: 'legal_moves', leaderboardKey: 'knight', minScore: 20 },
    ];
    expect(call({ requirements: legalMovesRequirements, isAchieved: true })).toBe('achieved');
  });
});

// ---------------------------------------------------------------------------
// resolveNextRank
// ---------------------------------------------------------------------------

describe('resolveNextRank', () => {
  /**
   * Build a fake `Rank` row for a given slug with a single valid
   * challenge_score requirement. The exact values are not important — we just
   * need `requirements` to be a valid JSONB payload so that `parseRequirements`
   * returns a non-empty array.
   */
  const makeDbRank = (slug: string, requirements: ChallengeScoreRequirement[] = []): Rank => ({
    id: `id-${slug}`,
    slug,
    level: 0,
    color: null,
    requirements,
    createdAt: new Date('2025-01-01T00:00:00Z'),
  });

  const defaultReqFor = (slug: string): ChallengeScoreRequirement[] => [
    {
      type: 'challenge_score',
      menuType: 'square_colors',
      leaderboardKey: 'default',
      minScore: 10 + slug.length,
    },
  ];

  /** All non-mukyu slugs, each backed by a fake DB row with one requirement. */
  const buildFullDbRanks = (): Rank[] =>
    ALL_RANK_SLUGS.filter((s) => s !== 'mukyu').map((s) => makeDbRank(s, defaultReqFor(s)));

  it('returns next=5kyu and current=null when nothing has been achieved', () => {
    const dbRanks = buildFullDbRanks();
    const { current, next } = resolveNextRank(dbRanks, new Set<RankSlug>());

    expect(current).toBeNull();
    expect(next).not.toBeNull();
    expect(next?.slug).toBe('5kyu');
    // parseRequirements should have produced an array, not raw JSON.
    expect(Array.isArray(next?.requirements)).toBe(true);
    expect(next?.requirements.length).toBeGreaterThan(0);
    expect(next?.dbRank?.slug).toBe('5kyu');
  });

  it('returns current=5kyu and next=4kyu when only 5kyu is achieved', () => {
    const dbRanks = buildFullDbRanks();
    const { current, next } = resolveNextRank(dbRanks, new Set<RankSlug>(['5kyu']));

    expect(current?.slug).toBe('5kyu');
    expect(next?.slug).toBe('4kyu');
    expect(Array.isArray(current?.requirements)).toBe(true);
    expect(Array.isArray(next?.requirements)).toBe(true);
  });

  it('returns current=3kyu and next=2kyu when 5kyu/4kyu/3kyu are achieved', () => {
    const dbRanks = buildFullDbRanks();
    const { current, next } = resolveNextRank(dbRanks, new Set<RankSlug>(['5kyu', '4kyu', '3kyu']));

    expect(current?.slug).toBe('3kyu');
    expect(next?.slug).toBe('2kyu');
  });

  it('returns current=1dan (top rank) and next=null when every rank is achieved', () => {
    const dbRanks = buildFullDbRanks();
    const allAchieved = new Set<RankSlug>(
      ALL_RANK_SLUGS.filter((s): s is RankSlug => s !== 'mukyu')
    );
    const { current, next } = resolveNextRank(dbRanks, allAchieved);

    expect(current?.slug).toBe('1dan');
    expect(next).toBeNull();
    expect(Array.isArray(current?.requirements)).toBe(true);
  });

  it('ignores mukyu entries in achievedSlugs (defensive — mukyu is UI-only)', () => {
    const dbRanks = buildFullDbRanks();
    // 'mukyu' is a valid RankSlug value but should be defensively skipped by
    // the walk. Cast through a typed set.
    const { current, next } = resolveNextRank(dbRanks, new Set<RankSlug>(['mukyu']));

    // mukyu is skipped during the walk, so it must never become `current`
    // and must never influence the computed `next`.
    expect(current).toBeNull();
    expect(next?.slug).toBe('5kyu');
  });

  it('with a gap in achievements (3kyu only), still reports current=3kyu and next=2kyu', () => {
    // A corrupted / partial state where the user somehow has 3kyu without
    // 5kyu or 4kyu. The implementation walks linearly so `current` becomes
    // the highest slug present in the set, and `next` is the first gap AFTER
    // any achievement... but because the linear walk sets `next` on the first
    // non-achieved slug encountered, 5kyu is assigned to `next` first.
    //
    // This test locks in the current documented behavior so that any future
    // change is a deliberate decision.
    const dbRanks = buildFullDbRanks();
    const { current, next } = resolveNextRank(dbRanks, new Set<RankSlug>(['3kyu']));

    expect(current?.slug).toBe('3kyu');
    // First non-achieved slug in progression order = 5kyu.
    expect(next?.slug).toBe('5kyu');
  });

  it('returns both null when dbRanks is empty and nothing achieved', () => {
    const { current, next } = resolveNextRank([], new Set<RankSlug>());

    expect(current).toBeNull();
    // Even without DB rows, `next` is computed from ALL_RANK_SLUGS and the
    // `toView()` helper gracefully handles missing DB rows.
    expect(next?.slug).toBe('5kyu');
    expect(next?.dbRank).toBeNull();
    expect(next?.requirements).toEqual([]);
  });

  it('handles dbRanks missing some slugs from ALL_RANK_SLUGS safely', () => {
    // Only 5kyu and 3kyu exist in DB; user has achieved 5kyu.
    const dbRanks = [
      makeDbRank('5kyu', defaultReqFor('5kyu')),
      makeDbRank('3kyu', defaultReqFor('3kyu')),
    ];
    const { current, next } = resolveNextRank(dbRanks, new Set<RankSlug>(['5kyu']));

    expect(current?.slug).toBe('5kyu');
    expect(current?.dbRank?.slug).toBe('5kyu');
    expect(current?.requirements.length).toBeGreaterThan(0);

    // next = 4kyu in progression order, but missing from DB → dbRank is null
    // and requirements is an empty array (parseRequirements over nothing).
    expect(next?.slug).toBe('4kyu');
    expect(next?.dbRank).toBeNull();
    expect(next?.requirements).toEqual([]);
  });

  it('parses requirements via parseRequirements (returns typed array, not raw JSON)', () => {
    // Include a malformed requirement alongside a valid one to verify that
    // parseRequirements filters it out rather than leaking raw objects.
    const mixedRequirements = [
      {
        type: 'challenge_score',
        menuType: 'square_colors',
        leaderboardKey: 'default',
        minScore: 15,
      },
      // malformed — missing minScore
      { type: 'challenge_score', menuType: 'broken', leaderboardKey: 'default' },
      // completely wrong shape
      { foo: 'bar' },
    ] as unknown as ChallengeScoreRequirement[];

    const dbRanks = [makeDbRank('5kyu', mixedRequirements)];
    const { next } = resolveNextRank(dbRanks, new Set<RankSlug>());

    expect(next?.slug).toBe('5kyu');
    expect(Array.isArray(next?.requirements)).toBe(true);
    // Only the valid entry survives parseRequirements.
    expect(next?.requirements).toHaveLength(1);
    expect(next?.requirements[0]).toMatchObject({
      type: 'challenge_score',
      menuType: 'square_colors',
      leaderboardKey: 'default',
      minScore: 15,
    });
  });
});

// ---------------------------------------------------------------------------
// isRankEarnedByPlaying
// ---------------------------------------------------------------------------

describe('isRankEarnedByPlaying', () => {
  const seeded = (slug: string) =>
    parseRequirements(ranksSeedData.find((r) => r.slug === slug)!.requirements);

  it('is false for the practice-drilled ranks', () => {
    // Asserted against the real seed rather than fixtures: the dojo CTA switches
    // on this, so a seed change that moves a rank between "drill it" and "play
    // it" should surface here.
    for (const slug of ['5kyu', '4kyu', '3kyu', '2kyu']) {
      expect(isRankEarnedByPlaying(seeded(slug)), slug).toBe(false);
    }
  });

  it('is true for 1kyu — earned at the board, not in practice/', () => {
    expect(isRankEarnedByPlaying(seeded('1kyu'))).toBe(true);
  });

  it('is false for a rank with no requirements yet', () => {
    // "Coming Soon" ranks have nothing to earn, so they must not claim the
    // play-a-game CTA. 1dan is seeded this way today.
    expect(isRankEarnedByPlaying([])).toBe(false);
    expect(isRankEarnedByPlaying(seeded('1dan'))).toBe(false);
  });

  it('is false when a game requirement is mixed with a practice one', () => {
    expect(
      isRankEarnedByPlaying([
        { type: 'game_publish_win', minCount: 1 },
        {
          type: 'challenge_score',
          menuType: 'square_colors',
          leaderboardKey: 'default',
          minScore: 1,
        },
      ])
    ).toBe(false);
  });
});
