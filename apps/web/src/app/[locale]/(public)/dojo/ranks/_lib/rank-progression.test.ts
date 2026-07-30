import { describe, expect, it } from 'vitest';

import { ALL_RANK_SLUGS } from '@/lib/db/data/ranks';
import type { ChallengeScoreRequirement, RankSlug } from '@/lib/db/data/ranks';
import type { Rank } from '@/lib/db/schema';

import {
  resolveDisplayAchievedSlugs,
  resolveEffectiveAchievedSlugs,
  resolveNextRank,
  resolveRecommendedNextSlug,
} from './rank-progression';

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
