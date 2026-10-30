import type { ChessTerm } from './types';

/**
 * The term's name in the viewer's locale: the Japanese name on `ja` when one
 * exists, the canonical (English) `term` everywhere else.
 */
export function termDisplayName(term: Pick<ChessTerm, 'term' | 'termJa'>, locale: string): string {
  return locale === 'ja' && term.termJa ? term.termJa : term.term;
}

/**
 * The term's definition in the viewer's locale: the English definition on
 * `en` when one exists, the stored `definition` everywhere else.
 */
export function termDisplayDefinition(
  term: Pick<ChessTerm, 'definition' | 'definitionEn'>,
  locale: string
): string {
  return locale === 'en' && term.definitionEn ? term.definitionEn : term.definition;
}
