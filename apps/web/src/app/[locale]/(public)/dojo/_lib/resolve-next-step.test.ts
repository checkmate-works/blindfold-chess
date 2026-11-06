import { describe, expect, it } from 'vitest';

import { ALL_RANK_SLUGS } from '@/lib/db/data/ranks';
import type { RankRequirement, RankSlug } from '@/lib/db/data/ranks';
import type { Rank } from '@/lib/db/schema';

import { resolveDojoNextStep } from './resolve-next-step';

/** Fake `Rank` row; `requirements` must be a valid JSONB payload for `parseRequirements`. */
const makeDbRank = (slug: string, requirements: RankRequirement[] = []): Rank => ({
  id: `id-${slug}`,
  slug,
  level: 0,
  color: null,
  requirements,
  createdAt: new Date('2025-01-01T00:00:00Z'),
});

const practiceReq = (): RankRequirement[] => [
  { type: 'challenge_score', menuType: 'square_colors', leaderboardKey: 'default', minScore: 10 },
];

const gamePublishReq = (): RankRequirement[] => [{ type: 'game_publish_win', minCount: 1 }];

/** Every non-mukyu slug backed by a DB row with one practice requirement. */
const buildFullDbRanks = (): Rank[] =>
  ALL_RANK_SLUGS.filter((s) => s !== 'mukyu').map((s) => makeDbRank(s, practiceReq()));

const resolve = (dbRanks: Rank[], achieved: RankSlug[] = []) =>
  resolveDojoNextStep({ dbRanks, achievedSlugs: new Set<RankSlug>(achieved), locale: 'en' });

describe('resolveDojoNextStep', () => {
  describe('when no rank is achieved', () => {
    it('recommends the lowest rank with requirements and sends the viewer to the practice index', () => {
      const step = resolve(buildFullDbRanks());

      expect(step.current).toBeNull();
      expect(step.next?.slug).toBe('5kyu');
      expect(step.nextCardState).toBe('next');
      expect(step.cta).toEqual({ href: '/en/practice', labelKey: 'viewAllPractices' });
    });
  });

  describe('when the next rank is earned by playing (game_publish_win requirement)', () => {
    it('sends the viewer to the game setup with the startAiGame label', () => {
      const dbRanks = [
        ...ALL_RANK_SLUGS.filter((s) => s !== 'mukyu' && s !== '1kyu' && s !== '1dan').map((s) =>
          makeDbRank(s, practiceReq())
        ),
        makeDbRank('1kyu', gamePublishReq()),
        makeDbRank('1dan', gamePublishReq()),
      ];
      const step = resolve(dbRanks, ['5kyu', '4kyu', '3kyu', '2kyu']);

      expect(step.current?.slug).toBe('2kyu');
      expect(step.next?.slug).toBe('1kyu');
      expect(step.nextCardState).toBe('next');
      expect(step.cta).toEqual({ href: '/en/games/new', labelKey: 'startAiGame' });
    });

    it('skips ranks below the highest achieved one (sparse achieved set)', () => {
      const dbRanks = buildFullDbRanks().map((r) =>
        r.slug === '1dan' ? makeDbRank('1dan', gamePublishReq()) : r
      );
      // 1kyu held outright, no kyū rows below it.
      const step = resolve(dbRanks, ['1kyu']);

      expect(step.current?.slug).toBe('1kyu');
      expect(step.next?.slug).toBe('1dan');
      expect(step.cta.labelKey).toBe('startAiGame');
    });
  });

  describe('when every rank is achieved', () => {
    it('has no next rank, no card state, and falls back to the practice index CTA', () => {
      const step = resolve(buildFullDbRanks(), ['5kyu', '4kyu', '3kyu', '2kyu', '1kyu', '1dan']);

      expect(step.current?.slug).toBe('1dan');
      expect(step.next).toBeNull();
      expect(step.nextCardState).toBeNull();
      expect(step.cta).toEqual({ href: '/en/practice', labelKey: 'viewAllPractices' });
    });
  });

  describe('when the next rank has no requirements yet', () => {
    it("marks the card 'coming-soon' and keeps the practice CTA", () => {
      const dbRanks = buildFullDbRanks().map((r) => (r.slug === '5kyu' ? makeDbRank('5kyu') : r));
      const step = resolve(dbRanks);

      expect(step.next?.slug).toBe('5kyu');
      expect(step.nextCardState).toBe('coming-soon');
      expect(step.cta.labelKey).toBe('viewAllPractices');
    });

    it("treats a next rank missing from the DB as 'coming-soon' too", () => {
      const dbRanks = buildFullDbRanks().filter((r) => r.slug !== '5kyu');
      const step = resolve(dbRanks);

      expect(step.next?.slug).toBe('5kyu');
      expect(step.next?.dbRank).toBeNull();
      expect(step.nextCardState).toBe('coming-soon');
    });
  });

  describe('curriculum cutoff', () => {
    it('truncates the TOC at the next rank and reports hidden curriculum when ranks with content lie above it', () => {
      const step = resolve(buildFullDbRanks());

      expect(step.maxVisibleSlug).toBe('5kyu');
      expect(step.hasHiddenCurriculum).toBe(true);
    });

    it('reports no hidden curriculum when the only ranks above the cutoff have no sections (next = 1dan)', () => {
      const step = resolve(buildFullDbRanks(), ['5kyu', '4kyu', '3kyu', '2kyu', '1kyu']);

      expect(step.maxVisibleSlug).toBe('1dan');
      expect(step.hasHiddenCurriculum).toBe(false);
    });

    it('shows the whole TOC with nothing hidden once every rank is achieved', () => {
      const step = resolve(buildFullDbRanks(), ['5kyu', '4kyu', '3kyu', '2kyu', '1kyu', '1dan']);

      expect(step.maxVisibleSlug).toBe(ALL_RANK_SLUGS[ALL_RANK_SLUGS.length - 1]);
      expect(step.hasHiddenCurriculum).toBe(false);
    });
  });
});
