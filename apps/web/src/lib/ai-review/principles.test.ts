import { describe, expect, it } from 'vitest';

import { termsPrinciples } from '@/lib/db/data/terms/principles';
import { slugifyTerm } from '@/lib/glossary/slug';

import type { Principle } from './principles';
import {
  PRINCIPLES,
  PRINCIPLE_GLOSSARY_SLUGS,
  PRINCIPLE_IDS,
  glossarySlugOf,
  isPrincipleId,
} from './principles';

describe('principles', () => {
  it('has unique ids and ends with the escape hatch', () => {
    expect(new Set(PRINCIPLE_IDS).size).toBe(PRINCIPLE_IDS.length);
    expect(PRINCIPLE_IDS.at(-1)).toBe('other');
  });

  it('is backed one-to-one by the glossary seed, which names it by slug', () => {
    const seeded = new Map(termsPrinciples.map((t) => [slugifyTerm(t.term), t]));
    for (const p of PRINCIPLES as readonly Principle[]) {
      if (p.id === 'other') {
        expect(p.glossarySlug).toBeUndefined();
        continue;
      }
      const term = seeded.get(p.glossarySlug ?? '');
      expect(term, `${p.id} → ${p.glossarySlug}`).toBeDefined();
      expect(term?.category).toBe('principle');
      expect(term?.definitionEn, p.id).toBeTruthy();
      expect(term?.termJa, p.id).toBeTruthy();
    }
    // And no seeded principle without a catalogue entry behind it.
    expect([...seeded.keys()].sort()).toEqual([...PRINCIPLE_GLOSSARY_SLUGS].sort());
  });

  it('resolves a slug per id', () => {
    expect(glossarySlugOf('recount_after_captures')).toBe('recount-after-captures');
    expect(glossarySlugOf('other')).toBeNull();
    expect(isPrincipleId('other')).toBe(true);
    expect(isPrincipleId('be_awesome')).toBe(false);
  });
});
