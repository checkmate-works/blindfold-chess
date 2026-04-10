import enMessages from '@/messages/en.json';
import { describe, expect, it } from 'vitest';

import { type ChapteredGuide, findChapter, getRankGuide } from './guideData';

describe('getRankGuide', () => {
  const realPages = enMessages.guides.pages as Record<string, unknown>;

  it('returns a flat guide for a flat rank', () => {
    const guide = getRankGuide(realPages, '5kyu');
    expect(guide).not.toBeNull();
    if (guide === null) return;
    expect(guide.format).toBe('flat');
    if (guide.format === 'flat') {
      expect(Array.isArray(guide.pages)).toBe(true);
      expect(guide.pages.length).toBeGreaterThan(0);
    }
  });

  it('returns a flat guide for the mukyu slug (DB-bypassed rank)', () => {
    const guide = getRankGuide(realPages, 'mukyu');
    expect(guide).not.toBeNull();
    expect(guide!.format).toBe('flat');
  });

  it('returns null for a rank without guide data (2kyu)', () => {
    expect(getRankGuide(realPages, '2kyu')).toBeNull();
  });

  it('returns null for a rank without guide data (1kyu)', () => {
    expect(getRankGuide(realPages, '1kyu')).toBeNull();
  });

  it('returns null for a rank without guide data (1dan)', () => {
    expect(getRankGuide(realPages, '1dan')).toBeNull();
  });

  it('returns a chaptered guide for a synthetic chaptered input', () => {
    const synthetic = {
      '5kyu': {
        format: 'chaptered',
        chapters: [
          {
            slug: 'diagonal',
            title: 'Diagonal',
            description: 'Diagonal intro',
            pages: [{ paragraphs: ['a'] }, { paragraphs: ['b'] }],
          },
          {
            slug: 'maneuvering',
            title: 'Maneuvering',
            description: 'Maneuvering intro',
            pages: [{ paragraphs: ['c'] }],
          },
        ],
      },
    } as Record<string, unknown>;
    const guide = getRankGuide(synthetic, '5kyu');
    expect(guide).not.toBeNull();
    if (guide === null) return;
    expect(guide.format).toBe('chaptered');
    if (guide.format === 'chaptered') {
      expect(guide.chapters).toHaveLength(2);
      expect(guide.chapters[0]!.slug).toBe('diagonal');
    }
  });

  it('returns null for an unknown rank slug', () => {
    // Cast because the type constrains to RankSlug, but at runtime any string may arrive
    expect(getRankGuide(realPages, 'nonexistent' as never)).toBeNull();
  });

  it('returns null when the entry is missing format', () => {
    const bad = { '5kyu': { pages: [] } } as Record<string, unknown>;
    expect(getRankGuide(bad, '5kyu')).toBeNull();
  });

  it('returns null when a flat entry is missing pages', () => {
    const bad = { '5kyu': { format: 'flat' } } as Record<string, unknown>;
    expect(getRankGuide(bad, '5kyu')).toBeNull();
  });

  it('returns null when format has an unknown value', () => {
    const bad = { '5kyu': { format: 'tree', pages: [] } } as Record<string, unknown>;
    expect(getRankGuide(bad, '5kyu')).toBeNull();
  });

  it('returns null when a chaptered entry is missing chapters', () => {
    const bad = { '5kyu': { format: 'chaptered' } } as Record<string, unknown>;
    expect(getRankGuide(bad, '5kyu')).toBeNull();
  });

  it('returns null when chapters is not an array', () => {
    const bad = { '5kyu': { format: 'chaptered', chapters: 'nope' } } as Record<string, unknown>;
    expect(getRankGuide(bad, '5kyu')).toBeNull();
  });

  it('returns null when pages is not an array in a flat entry', () => {
    const bad = { '5kyu': { format: 'flat', pages: 'nope' } } as Record<string, unknown>;
    expect(getRankGuide(bad, '5kyu')).toBeNull();
  });

  it('returns null when entry is undefined', () => {
    const bad = {} as Record<string, unknown>;
    expect(getRankGuide(bad, '5kyu')).toBeNull();
  });

  it('returns null when entry is null', () => {
    const bad = { '5kyu': null } as Record<string, unknown>;
    expect(getRankGuide(bad, '5kyu')).toBeNull();
  });

  it('returns null when entry is a primitive', () => {
    const bad = { '5kyu': 'flat' } as Record<string, unknown>;
    expect(getRankGuide(bad, '5kyu')).toBeNull();
  });
});

describe('findChapter', () => {
  const guide: ChapteredGuide = {
    format: 'chaptered',
    chapters: [
      {
        slug: 'diagonal',
        title: 'Diagonal',
        description: 'Diagonal intro',
        pages: [{ paragraphs: ['a'] }],
      },
      {
        slug: 'maneuvering',
        title: 'Maneuvering',
        description: 'Maneuvering intro',
        pages: [{ paragraphs: ['b'] }],
      },
    ],
  };

  it('returns the matching chapter', () => {
    expect(findChapter(guide, 'diagonal')?.slug).toBe('diagonal');
    expect(findChapter(guide, 'maneuvering')?.title).toBe('Maneuvering');
  });

  it('returns null when the chapter is not found', () => {
    expect(findChapter(guide, 'missing')).toBeNull();
  });
});
