import enMessages from '@/messages/en.json';
import esMessages from '@/messages/es.json';
import jaMessages from '@/messages/ja.json';
import ptBRMessages from '@/messages/pt-BR.json';
import { describe, expect, it } from 'vitest';

import { encodeFenToBase64Url } from '@/app/[locale]/(public)/practice/(free-play)/position-memory/_lib/share-url';
import { CASTLED_KINGSIDE_FEN } from '@/app/[locale]/(public)/ranks/_components/castled-kingside-fen';
import { SCATTERED_PAWNS_FEN } from '@/app/[locale]/(public)/ranks/_components/scattered-pawns-fen';

import { getGuideInlineLink } from './paragraphInlineLinks';

/**
 * Stand-in for next-intl's translator. We use the real i18n JSON so that
 * any drift between hard-coded keys in `GUIDE_LINK_MAP` and the message
 * files surfaces as a test failure instead of a runtime crash.
 *
 * The parameter is typed loosely (`unknown`) because en/ja/es JSON files
 * have slightly different shapes in namespaces unrelated to `guides`; we
 * only care about the `guides` subtree and resolve into it dynamically.
 */
function makeTranslator(messages: unknown) {
  return (key: string): string => {
    // Keys look like `inlineLinks.3kyu.diagonalQuizLabel` — traverse the
    // `guides` namespace that `getGuideInlineLink` implicitly uses.
    const segments = key.split('.');
    let cursor: unknown = (messages as { guides: unknown }).guides;
    for (const seg of segments) {
      if (cursor && typeof cursor === 'object' && seg in (cursor as Record<string, unknown>)) {
        cursor = (cursor as Record<string, unknown>)[seg];
      } else {
        throw new Error(`missing i18n key: guides.${key}`);
      }
    }
    if (typeof cursor !== 'string') {
      throw new Error(`i18n key did not resolve to a string: guides.${key}`);
    }
    return cursor;
  };
}

describe('getGuideInlineLink', () => {
  const tEn = makeTranslator(enMessages);

  it('returns null for a coordinate with no entry', () => {
    expect(getGuideInlineLink('5kyu', 1, 0, 'en', tEn)).toBeNull();
  });

  it('resolves the 5kyu page 2 paragraph 9 quadrant-method article link', () => {
    const info = getGuideInlineLink('5kyu', 2, 9, 'en', tEn);
    expect(info).not.toBeNull();
    expect(info).toEqual({
      label: enMessages.guides.inlineLinks['5kyu'].quadrantMethodArticleLabel,
      href: '/en/articles/switched-to-quadrant-method',
      leadIn: undefined,
    });
  });

  it('prepends the locale prefix to the href', () => {
    const info = getGuideInlineLink('3kyu', 1, 1, 'ja', makeTranslator(jaMessages));
    expect(info?.href).toBe('/ja/practice/diagonal-quiz/tutorial');
  });

  it('expands the leadIn paragraph when an entry has leadInKey', () => {
    // mukyu:1:3 is the "learn about algebraic notation" card with a
    // `leadInKey` of `learnArticle`.
    const info = getGuideInlineLink('mukyu', 1, 3, 'en', tEn);
    expect(info).not.toBeNull();
    expect(info?.leadIn).toBe(enMessages.guides.inlineLinks.mukyu.learnArticle);
    expect(info?.label).toBe(enMessages.guides.inlineLinks.mukyu.learnArticleLabel);
    expect(info?.href).toBe('/en/learn/notation/algebraic-notation');
  });

  it('leaves leadIn undefined for entries without a leadInKey', () => {
    const info = getGuideInlineLink('mukyu', 2, 1, 'en', tEn);
    expect(info?.leadIn).toBeUndefined();
  });

  it('points the 2kyu page-1 "solve" CTA at the live ScatteredPawns FEN token', () => {
    // Drift guard: the hardcoded href token in GUIDE_LINK_MAP must stay in sync
    // with the FEN the guide board actually renders. If the FEN changes, this
    // fails until the token is regenerated.
    const info = getGuideInlineLink('2kyu', 1, 3, 'ja', makeTranslator(jaMessages));
    const expectedToken = encodeFenToBase64Url(SCATTERED_PAWNS_FEN);
    expect(info?.href).toBe(`/ja/practice/position-memory/custom/${expectedToken}`);
  });

  it('points the 2kyu page-2 "solve" CTA at the live CastledKingside FEN token', () => {
    const info = getGuideInlineLink('2kyu', 2, 3, 'ja', makeTranslator(jaMessages));
    const expectedToken = encodeFenToBase64Url(CASTLED_KINGSIDE_FEN);
    expect(info?.href).toBe(`/ja/practice/position-memory/custom/${expectedToken}`);
  });

  it('resolves the mukyu 5kyuGuideLabel bracket-quoted i18n key without a typo', () => {
    // `5kyuGuideLabel` starts with a digit, which means the hardcoded
    // `labelKey: '5kyuGuideLabel'` in GUIDE_LINK_MAP must match the i18n key
    // exactly. If anyone ever changes one but not the other, this will
    // throw from `makeTranslator`.
    const info = getGuideInlineLink('mukyu', 3, 2, 'en', tEn);
    expect(info?.label).toBe(enMessages.guides.inlineLinks.mukyu['5kyuGuideLabel']);
    expect(info?.href).toBe('/en/guides/ranks/5kyu');
  });

  describe('all hard-coded i18n keys resolve in every locale', () => {
    // Exhaustive drift guard: iterate every (rank, page, paragraph) coordinate
    // in the real i18n data and confirm that `getGuideInlineLink` returns a
    // value whose label/leadIn strings are non-empty in all three locales.
    const coords: Array<[Parameters<typeof getGuideInlineLink>[0], number, number]> = [
      ['3kyu', 1, 1],
      ['3kyu', 8, 1],
      ['5kyu', 2, 9],
      ['4kyu', 1, 6],
      ['4kyu', 2, 4],
      ['4kyu', 3, 3],
      ['4kyu', 4, 0],
      ['mukyu', 1, 3],
      ['mukyu', 2, 1],
      ['mukyu', 2, 3],
      ['mukyu', 3, 0],
      ['mukyu', 3, 2],
      ['2kyu', 1, 1],
      ['2kyu', 1, 3],
      ['2kyu', 2, 1],
      ['2kyu', 2, 3],
      ['2kyu', 3, 3],
      ['2kyu', 4, 1],
      ['2kyu', 4, 3],
    ];

    // Keep in sync with SUPPORTED_LOCALES in @/config. Every locale shipped
    // by the app needs to be covered so that missing keys in translated
    // message files surface as test failures rather than runtime crashes in
    // the rank guide renderer.
    const byLocale: Record<'en' | 'ja' | 'es' | 'pt-BR', unknown> = {
      en: enMessages,
      ja: jaMessages,
      es: esMessages,
      'pt-BR': ptBRMessages,
    };
    for (const locale of ['en', 'ja', 'es', 'pt-BR'] as const) {
      const t = makeTranslator(byLocale[locale]);
      for (const [rank, page, paragraph] of coords) {
        it(`${locale}: ${rank}:${page}:${paragraph}`, () => {
          const info = getGuideInlineLink(rank, page, paragraph, locale, t);
          expect(info).not.toBeNull();
          expect(info!.label.length).toBeGreaterThan(0);
          if (info!.leadIn !== undefined) {
            expect(info!.leadIn.length).toBeGreaterThan(0);
          }
        });
      }
    }
  });
});
