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
  buildRequirementLabels,
  getBeltColorHex,
  getRankCardState,
  isRankEarnedByPlaying,
  isWhiteBelt,
  resolveDisplayAchievedSlugs,
  resolveEffectiveAchievedSlugs,
  resolveNextRank,
  resolveRecommendedNextSlug,
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
    if (key === 'gamePublishWin') return `Beat the engine ${values?.minCount}+ times`;
    if (key === 'gamePublishWinHiddenBoard') return `Keep the board hidden and win`;
    if (key === 'gamePublishWinHiddenBoardNote') return `Peeking allowed up to ${values?.maxPeeks}`;
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

  it('should generate the game setup URL and a peek-allowance note for game_publish_win_hidden_board', () => {
    const items = buildRequirementItems(
      [{ type: 'game_publish_win_hidden_board', minCount: 1, maxPeeks: 5 }],
      'en',
      mockT
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      href: '/en/games/new/standard',
      label: 'Keep the board hidden and win',
      note: 'Peeking allowed up to 5',
    });
  });
});

// ---------------------------------------------------------------------------
// buildRequirementLabels
// ---------------------------------------------------------------------------

describe('buildRequirementLabels', () => {
  const mockT = (key: string, values?: Record<string, string | number | Date>) => {
    if (key === 'gamePublishWin') return `Beat the engine ${values?.minCount}+ times`;
    if (key === 'gamePublishWinHiddenBoard') return `Keep the board hidden and win`;
    return key;
  };

  it('should return a plain label (no href) for game_publish_win', () => {
    expect(buildRequirementLabels({ type: 'game_publish_win', minCount: 1 }, mockT)).toEqual([
      'Beat the engine 1+ times',
    ]);
  });

  it('should return a plain label (no href) for game_publish_win_hidden_board', () => {
    expect(
      buildRequirementLabels(
        { type: 'game_publish_win_hidden_board', minCount: 1, maxPeeks: 5 },
        mockT
      )
    ).toEqual(['Keep the board hidden and win']);
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
    isRecommendedNext?: boolean;
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
      isRecommendedNext: false,
    };
    const args = { ...defaults, ...overrides };
    return getRankCardState(args.inDb, args.requirements, args.isAchieved, args.isRecommendedNext);
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

  // --- Achievement / recommendation states ---

  it('should return "achieved" when the rank is achieved', () => {
    expect(call({ isAchieved: true })).toBe('achieved');
  });

  it('should return "next" for the recommended next rank', () => {
    expect(call({ isRecommendedNext: true })).toBe('next');
  });

  it('should return "locked" (plain unachieved) otherwise — there is NO gate on lower ranks', () => {
    // Under skip-grants every defined rank is browsable and earnable; the
    // state only decides styling (recommended glow vs plain card).
    expect(call({})).toBe('locked');
  });

  it('should prefer "achieved" over the recommendation flag', () => {
    expect(call({ isAchieved: true, isRecommendedNext: true })).toBe('achieved');
  });

  // --- Priority checks ---

  it('"coming-soon" (not in DB) takes priority over achieved state', () => {
    expect(call({ inDb: false, isAchieved: true })).toBe('coming-soon');
  });

  it('"coming-soon" (empty requirements) takes priority over achieved state', () => {
    expect(call({ requirements: [], isAchieved: true })).toBe('coming-soon');
  });

  it('should not return "coming-soon" for a rank with defined requirements (4kyu)', () => {
    const legalMovesRequirements: ChallengeScoreRequirement[] = [
      { type: 'challenge_score', menuType: 'legal_moves', leaderboardKey: 'bishop', minScore: 10 },
      { type: 'challenge_score', menuType: 'legal_moves', leaderboardKey: 'knight', minScore: 20 },
    ];
    expect(call({ requirements: legalMovesRequirements })).not.toBe('coming-soon');
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

  it('with a gap in achievements (3kyu only, no 5kyu/4kyu), recommends next=2kyu — never a rank below current', () => {
    // Skip-grants make this a normal state: the user jumped straight to
    // 3kyu without 5kyu or 4kyu. `next` must be forward-only (the first
    // unachieved slug ABOVE current), never a lower rank the user could
    // read as "you regressed".
    const dbRanks = buildFullDbRanks();
    const { current, next } = resolveNextRank(dbRanks, new Set<RankSlug>(['3kyu']));

    expect(current?.slug).toBe('3kyu');
    expect(next?.slug).toBe('2kyu');
  });

  it('with only 1dan achieved (skip-granted, no kyū ranks at all), reports current=1dan and next=null', () => {
    // Reproduces the reported bug: a rank-less user publishes a
    // black-belt-grade game and is skip-granted straight to 1dan. The old
    // "first unachieved overall" walk wrongly recommended 5kyu as next —
    // a rank strictly below what the user already holds. 1dan is the top
    // rank, so next must be null (nothing higher to recommend), not 5kyu.
    const dbRanks = buildFullDbRanks();
    const { current, next } = resolveNextRank(dbRanks, new Set<RankSlug>(['1dan']));

    expect(current?.slug).toBe('1dan');
    expect(next).toBeNull();
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
// resolveRecommendedNextSlug
// ---------------------------------------------------------------------------

describe('resolveRecommendedNextSlug', () => {
  it('returns 5kyu when nothing is achieved', () => {
    expect(resolveRecommendedNextSlug(new Set<RankSlug>())).toBe('5kyu');
  });

  it('returns the slug directly above the highest achieved rank', () => {
    expect(resolveRecommendedNextSlug(new Set<RankSlug>(['5kyu', '4kyu', '3kyu']))).toBe('2kyu');
  });

  it('never recommends a rank below current, even with skip-granted gaps', () => {
    // 3kyu achieved without 5kyu/4kyu — a lower unachieved rank must not be
    // recommended; only a forward step counts as "next".
    expect(resolveRecommendedNextSlug(new Set<RankSlug>(['3kyu']))).toBe('2kyu');
  });

  it('returns null once the top rank (1dan) is achieved, even with no kyū ranks at all', () => {
    // Reproduces the reported bug scenario directly.
    expect(resolveRecommendedNextSlug(new Set<RankSlug>(['1dan']))).toBeNull();
  });

  it('returns null when every real rank is achieved', () => {
    const allAchieved = new Set<RankSlug>(
      ALL_RANK_SLUGS.filter((s): s is RankSlug => s !== 'mukyu')
    );
    expect(resolveRecommendedNextSlug(allAchieved)).toBeNull();
  });

  it('ignores mukyu (UI-only, never a real achieved rank)', () => {
    expect(resolveRecommendedNextSlug(new Set<RankSlug>(['mukyu']))).toBe('5kyu');
  });
});

// ---------------------------------------------------------------------------
// resolveEffectiveAchievedSlugs
// ---------------------------------------------------------------------------

describe('resolveEffectiveAchievedSlugs', () => {
  it('returns the same empty set when nothing is achieved', () => {
    const achieved = new Set<RankSlug>();
    expect(resolveEffectiveAchievedSlugs(achieved)).toEqual(new Set<RankSlug>());
  });

  it('fills in every lower rank when only the top rank (1dan) is achieved — the reported bug', () => {
    // A 1dan holder with no kyū rows should see every lower rank checked
    // off on the ranks grid / curriculum, not just 1dan itself.
    const achieved = new Set<RankSlug>(['1dan']);
    expect(resolveEffectiveAchievedSlugs(achieved)).toEqual(
      new Set<RankSlug>(['5kyu', '4kyu', '3kyu', '2kyu', '1kyu', '1dan'])
    );
  });

  it('fills gaps below the highest achieved rank even with a skip-granted middle gap', () => {
    // 3kyu achieved without 5kyu/4kyu — effective achievement still back-fills
    // 5kyu and 4kyu since they're below the highest achieved level.
    const achieved = new Set<RankSlug>(['3kyu']);
    expect(resolveEffectiveAchievedSlugs(achieved)).toEqual(
      new Set<RankSlug>(['5kyu', '4kyu', '3kyu'])
    );
  });

  it('is a no-op when every rank below the highest is already literally achieved', () => {
    const achieved = new Set<RankSlug>(['5kyu', '4kyu', '3kyu']);
    expect(resolveEffectiveAchievedSlugs(achieved)).toEqual(achieved);
  });

  it('leaves the set untouched when only mukyu is present — no real rank to expand from', () => {
    const achieved = new Set<RankSlug>(['mukyu']);
    expect(resolveEffectiveAchievedSlugs(achieved)).toEqual(achieved);
  });
});

// ---------------------------------------------------------------------------
// resolveDisplayAchievedSlugs
// ---------------------------------------------------------------------------

describe('resolveDisplayAchievedSlugs', () => {
  it('does not include mukyu when nothing is achieved', () => {
    const achieved = new Set<RankSlug>();
    expect(resolveDisplayAchievedSlugs(achieved)).toEqual(new Set<RankSlug>());
  });

  it('includes mukyu plus every backfilled lower rank once a real rank is held', () => {
    const achieved = new Set<RankSlug>(['1dan']);
    expect(resolveDisplayAchievedSlugs(achieved)).toEqual(
      new Set<RankSlug>(['5kyu', '4kyu', '3kyu', '2kyu', '1kyu', '1dan', 'mukyu'])
    );
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

  it('is true for 1dan — earned at the board, the board-hidden variant', () => {
    expect(isRankEarnedByPlaying(seeded('1dan'))).toBe(true);
  });

  it('is false for a rank with no requirements at all', () => {
    // "Coming Soon" ranks have nothing to earn, so they must not claim the
    // play-a-game CTA.
    expect(isRankEarnedByPlaying([])).toBe(false);
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

  it('is true when both game-publish variants are present together', () => {
    expect(
      isRankEarnedByPlaying([
        { type: 'game_publish_win', minCount: 1 },
        { type: 'game_publish_win_hidden_board', minCount: 1, maxPeeks: 5 },
      ])
    ).toBe(true);
  });
});
