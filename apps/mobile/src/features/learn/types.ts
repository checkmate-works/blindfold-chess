/** The web's article categories, in the order the learn tab lists them. */
export const LEARN_CATEGORIES = [
  "moves",
  "coordinates",
  "notation",
  "memory",
  "practice",
] as const;
export type LearnCategory = (typeof LEARN_CATEGORIES)[number];

/** One learn article, in each language the web has it in. */
export type LearnArticle = {
  slug: string;
  category: string;
  difficulty: string;
  publishedAt: string;
  /** Keyed by locale (`en`, `ja`, `es`). */
  title: Record<string, string>;
  excerpt: Record<string, string>;
  /** Markdown. */
  body: Record<string, string>;
};

/** The article text in `locale`, falling back to English. */
export function localized(record: Record<string, string>, locale: string) {
  return record[locale] ?? record[locale.split("-")[0]] ?? record.en;
}
