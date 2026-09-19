import { describe, expect, it } from 'vitest';

import { chessTerms } from '@/lib/db/data/chess-terms';

import { slugifyTerm } from './slug';

describe('slugifyTerm', () => {
  it('lowercases and hyphenates a plain term', () => {
    expect(slugifyTerm('Rook Battery')).toBe('rook-battery');
    expect(slugifyTerm('Activate the king in the endgame')).toBe(
      'activate-the-king-in-the-endgame'
    );
  });

  it('drops characters outside [a-z0-9-] without collapsing or trimming hyphens', () => {
    // Pinned deliberately, not aspirationally: this is the documented
    // difference from `deriveSlugFromTitle` in `@/lib/validations/slug`, which
    // additionally collapses hyphen runs and trims the ends. Changing
    // `slugifyTerm` to match would rewrite `glossary_terms.slug` and every
    // `/glossary/<slug>` URL already in the wild, so the shapes below are the
    // contract, and the corpus guard further down is what keeps the seed data
    // from ever needing them.
    expect(slugifyTerm("King's Indian")).toBe('kings-indian');
    expect(slugifyTerm('Check -mate')).toBe('check--mate');
    expect(slugifyTerm('-Zwischenzug')).toBe('-zwischenzug');
  });
});

describe('the glossary seed corpus under slugifyTerm', () => {
  const slugs = chessTerms.map((term) => ({ term: term.term, slug: slugifyTerm(term.term) }));

  it('never produces a doubled, leading, trailing or empty hyphenation', () => {
    // A term name carrying a symbol next to a space, or leading with one, is
    // all it takes: `slugifyTerm` deletes the symbol and leaves the hyphens
    // it made from the surrounding whitespace untouched, so the term lands at
    // a URL like `/glossary/check--mate`. Nothing else in the app rejects
    // such a slug — the seeder writes whatever it is handed — so this is the
    // check that fails first when a term like that is added.
    for (const { term, slug } of slugs) {
      expect(slug, term).not.toBe('');
      expect(slug, term).not.toMatch(/--/);
      expect(slug, term).not.toMatch(/^-|-$/);
    }
  });

  it('assigns every term a distinct slug', () => {
    // Two terms colliding here would silently share one glossary page: the
    // seeder upserts on `slug`, so the second term overwrites the first, and
    // `generateStaticParams` de-duplicates its slugs through a `Set`, so the
    // build stays green while one term disappears from the site. Lacking the
    // hyphen collapsing makes `slugifyTerm` the more collision-prone of the
    // two derivations, which is why the guard lives on this side.
    const byslug = new Map<string, string[]>();
    for (const { term, slug } of slugs) {
      byslug.set(slug, [...(byslug.get(slug) ?? []), term]);
    }
    const collisions = [...byslug].filter(([, terms]) => terms.length > 1);
    expect(collisions).toEqual([]);
  });
});
