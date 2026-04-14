import { describe, expect, it } from 'vitest';

import enMessages from './en.json';
import esMessages from './es.json';
import jaMessages from './ja.json';

const locales = {
  en: enMessages as unknown as Record<string, unknown>,
  ja: jaMessages as unknown as Record<string, unknown>,
  es: esMessages as unknown as Record<string, unknown>,
};

function keyPaths(obj: unknown, prefix = ''): string[] {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return [prefix];
  const out: string[] = [];
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      out.push(...keyPaths(v, p));
    } else {
      out.push(p);
    }
  }
  return out;
}

function getAt(obj: Record<string, unknown>, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (acc, key) =>
        acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined,
      obj
    );
}

describe('guides.* i18n integrity', () => {
  it('all locales define a guides namespace', () => {
    for (const [name, messages] of Object.entries(locales)) {
      expect(messages.guides, `${name}.json should define guides`).toBeDefined();
    }
  });

  it('all locales share the same guides.* key structure', () => {
    const enPaths = keyPaths((locales.en as { guides: unknown }).guides).sort();
    for (const [name, messages] of Object.entries(locales)) {
      if (name === 'en') continue;
      const paths = keyPaths((messages as { guides: unknown }).guides).sort();
      expect(paths, `${name}.json guides structure must match en.json`).toEqual(enPaths);
    }
  });

  it('all locales share the same guides.pages rank keys', () => {
    const enRankKeys = Object.keys(
      (locales.en as { guides: { pages: Record<string, unknown> } }).guides.pages
    ).sort();
    for (const [name, messages] of Object.entries(locales)) {
      if (name === 'en') continue;
      const rankKeys = Object.keys(
        (messages as { guides: { pages: Record<string, unknown> } }).guides.pages
      ).sort();
      expect(rankKeys, `${name}.json guides.pages ranks must match en.json`).toEqual(enRankKeys);
    }
  });

  it('every rank entry declares format: "flat" (no rank is chaptered yet)', () => {
    for (const [name, messages] of Object.entries(locales)) {
      const pages = (messages as { guides: { pages: Record<string, { format: string }> } }).guides
        .pages;
      for (const [slug, entry] of Object.entries(pages)) {
        expect(entry.format, `${name}.json guides.pages.${slug}.format`).toBe('flat');
      }
    }
  });

  it('every flat rank has matching page counts across all locales', () => {
    const enPages = (
      locales.en as { guides: { pages: Record<string, { format: string; pages: unknown[] }> } }
    ).guides.pages;
    for (const [slug, enEntry] of Object.entries(enPages)) {
      if (enEntry.format !== 'flat') continue;
      const enCount = enEntry.pages.length;
      for (const [name, messages] of Object.entries(locales)) {
        if (name === 'en') continue;
        const entry = (
          messages as {
            guides: { pages: Record<string, { format: string; pages: unknown[] }> };
          }
        ).guides.pages[slug];
        expect(
          entry.pages.length,
          `${name}.json guides.pages.${slug}.pages length must equal en.json (${enCount})`
        ).toBe(enCount);
      }
    }
  });

  it('every flat rank has matching paragraph counts per page across all locales (drift check)', () => {
    const enPages = (
      locales.en as {
        guides: {
          pages: Record<string, { format: string; pages: { paragraphs: unknown[] }[] }>;
        };
      }
    ).guides.pages;
    for (const [slug, enEntry] of Object.entries(enPages)) {
      if (enEntry.format !== 'flat') continue;
      enEntry.pages.forEach((enPage, pageIdx) => {
        const enParaCount = enPage.paragraphs.length;
        for (const [name, messages] of Object.entries(locales)) {
          if (name === 'en') continue;
          const otherPage = (
            messages as {
              guides: {
                pages: Record<string, { format: string; pages: { paragraphs: unknown[] }[] }>;
              };
            }
          ).guides.pages[slug].pages[pageIdx];
          expect(
            otherPage.paragraphs.length,
            `${name}.json guides.pages.${slug}.pages[${pageIdx}].paragraphs length must equal en.json (${enParaCount})`
          ).toBe(enParaCount);
        }
      });
    }
  });

  it('does NOT contain any of the legacy zombie keys', () => {
    const zombies = [
      'ranks.detail.guidePages',
      'ranks.detail.3kyuGuideLinks',
      'ranks.detail.4kyuGuideLinks',
      'ranks.detail.5kyuGuideLinks',
      'ranks.detail.mukyuGuideLinks',
      'metadata.rankGuide',
    ];
    for (const [name, messages] of Object.entries(locales)) {
      for (const zombie of zombies) {
        expect(
          getAt(messages, zombie),
          `${name}.json must not contain legacy key ${zombie}`
        ).toBeUndefined();
      }
    }
  });

  it('retains ranks.detail.mukyuRelatedLinks in every locale (split-off bit kept on rank detail)', () => {
    for (const [name, messages] of Object.entries(locales)) {
      expect(
        getAt(messages, 'ranks.detail.mukyuRelatedLinks'),
        `${name}.json must still contain ranks.detail.mukyuRelatedLinks`
      ).toBeDefined();
    }
  });
});
