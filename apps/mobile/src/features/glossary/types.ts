/** The web's glossary categories, in the order the list groups them. */
export const GLOSSARY_CATEGORIES = [
  "tactics",
  "strategy",
  "endgame",
  "opening",
  "structure",
  "general",
  "principle",
] as const;

/** One glossary entry, from the web's seed data. */
export type GlossaryTerm = {
  /** The web's slug (`slugifyTerm`), so it matches the web URL. */
  slug: string;
  term: string;
  termJa: string;
  definitionJa: string;
  definitionEn: string;
  aliases: string[];
  /** Slugs of related terms. */
  relatedTerms: string[];
  category: string;
};

/**
 * The term's name and definition in the app's language. The web seed has
 * Japanese and English only; the other languages read the English.
 */
export function termText(term: GlossaryTerm, locale: string) {
  return locale === "ja"
    ? { name: term.termJa, definition: term.definitionJa }
    : { name: term.term, definition: term.definitionEn };
}
