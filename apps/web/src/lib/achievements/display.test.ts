import enMessages from '@/messages/en.json';
import esMessages from '@/messages/es.json';
import jaMessages from '@/messages/ja.json';
import { describe, expect, it } from 'vitest';

import { achievementsSeedData } from '@/lib/db/data/achievements';

import {
  ACHIEVEMENT_ICON_EMOJI,
  getAchievementDisplayName,
  getAchievementIconEmoji,
  slugToDisplayName,
} from './display';

// ---------------------------------------------------------------------------
// Fake `t` compatible with next-intl's configured getMessageFallback behaviour
// (returns the full key path when a message is missing — see
// src/i18n/error-handling.ts).
// ---------------------------------------------------------------------------

type MessagesTree = Record<string, unknown>;

function createFakeT(messages: MessagesTree) {
  return (key: string, values?: Record<string, string | number | Date>): string => {
    const parts = key.split('.');
    let cur: unknown = messages;
    for (const part of parts) {
      if (cur && typeof cur === 'object' && part in (cur as Record<string, unknown>)) {
        cur = (cur as Record<string, unknown>)[part];
      } else {
        cur = undefined;
        break;
      }
    }
    if (typeof cur !== 'string') {
      // Match next-intl's fallback: return the full key path on miss.
      return key;
    }
    if (values) {
      return cur.replace(/\{(\w+)\}/g, (_, token) => {
        const replacement = values[token];
        return replacement === undefined ? `{${token}}` : String(replacement);
      });
    }
    return cur;
  };
}

// ---------------------------------------------------------------------------
// getAchievementIconEmoji
// ---------------------------------------------------------------------------

describe('getAchievementIconEmoji', () => {
  it('returns the gold trophy for trophy-gold', () => {
    expect(getAchievementIconEmoji('trophy-gold')).toBe('🥇');
  });

  it('returns the silver trophy for trophy-silver', () => {
    expect(getAchievementIconEmoji('trophy-silver')).toBe('🥈');
  });

  it('returns the bronze trophy for trophy-bronze', () => {
    expect(getAchievementIconEmoji('trophy-bronze')).toBe('🥉');
  });

  it('falls back to a generic trophy for unknown icon keys', () => {
    expect(getAchievementIconEmoji('unknown-icon')).toBe('🏆');
    expect(getAchievementIconEmoji('')).toBe('🏆');
  });

  it('exposes the underlying map for consumers that need it', () => {
    expect(ACHIEVEMENT_ICON_EMOJI).toEqual({
      'trophy-gold': '🥇',
      'trophy-silver': '🥈',
      'trophy-bronze': '🥉',
    });
  });
});

// ---------------------------------------------------------------------------
// getAchievementDisplayName — parameterized happy path over every seeded slug
// ---------------------------------------------------------------------------

describe('getAchievementDisplayName (en)', () => {
  const t = createFakeT(enMessages as MessagesTree);

  it.each(achievementsSeedData.map((seed) => [seed.slug, seed.category] as const))(
    'returns a properly interpolated human-readable name for %s',
    (slug, category) => {
      const result = getAchievementDisplayName({ slug, category }, t);
      // Must not be the raw slug.
      expect(result).not.toBe(slug);
      // Must not be the raw key literal or any key literal fragment.
      expect(result).not.toContain('Achievements.monthlyLeaderboard');
      // Must not contain unresolved interpolation placeholders.
      expect(result).not.toMatch(/\{(menuType|leaderboardKey|placement)\}/);
      // Must be non-empty.
      expect(result.length).toBeGreaterThan(0);
    }
  );

  it('produces a readable name for a representative coordinate_quiz seed', () => {
    const result = getAchievementDisplayName(
      { slug: 'monthly-coordinate_quiz-white-1st', category: 'monthly_leaderboard' },
      t
    );
    expect(result).toBe('Coordinate Quiz (White) — 1st Place');
  });

  it('falls back to slugToDisplayName for non-monthly-leaderboard categories', () => {
    const slug = 'cumulative-first-win';
    const result = getAchievementDisplayName({ slug, category: 'cumulative' }, t);
    expect(result).toBe(slugToDisplayName(slug));
  });

  it('falls back gracefully when the slug is unparseable', () => {
    const slug = 'monthly-weird-slug';
    const result = getAchievementDisplayName({ slug, category: 'monthly_leaderboard' }, t);
    expect(result).toBe(slugToDisplayName(slug));
  });

  it('falls back when a monthly slug references an unknown menuType', () => {
    const slug = 'monthly-nonexistent_quiz-white-1st';
    const result = getAchievementDisplayName({ slug, category: 'monthly_leaderboard' }, t);
    expect(result).toBe(slugToDisplayName(slug));
  });

  it('does not throw if `t` itself throws (defensive safety net)', () => {
    const throwingT: Parameters<typeof getAchievementDisplayName>[1] = () => {
      throw new Error('boom');
    };
    expect(() =>
      getAchievementDisplayName(
        { slug: 'monthly-coordinate_quiz-white-1st', category: 'monthly_leaderboard' },
        throwingT
      )
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Coverage sanity — every seeded slug must resolve cleanly in all locales.
// This is the quality gate: a missing translation will fail loudly here.
// ---------------------------------------------------------------------------

const LOCALES: ReadonlyArray<readonly [string, MessagesTree]> = [
  ['en', enMessages as MessagesTree],
  ['ja', jaMessages as MessagesTree],
  ['es', esMessages as MessagesTree],
];

describe.each(LOCALES)('getAchievementDisplayName coverage sanity — %s', (_locale, messages) => {
  const t = createFakeT(messages);

  it.each(achievementsSeedData.map((seed) => [seed.slug, seed.category] as const))(
    'resolves %s to a fully localized name',
    (slug, category) => {
      const result = getAchievementDisplayName({ slug, category }, t);
      expect(result, `Missing translation for ${slug} — got "${result}"`).not.toBe(slug);
      expect(result).not.toContain('Achievements.monthlyLeaderboard');
      expect(result).not.toMatch(/\{(menuType|leaderboardKey|placement)\}/);
      // Must not equal the fallback slugToDisplayName (sanity: means keys found).
      expect(
        result,
        `Fell back to slugToDisplayName for ${slug} in locale — expected full i18n resolution`
      ).not.toBe(slugToDisplayName(slug));
    }
  );
});
