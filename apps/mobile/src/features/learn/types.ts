import type Ionicons from "@expo/vector-icons/Ionicons";

/** The web's article categories, in the order the learn tab lists them. */
export const LEARN_CATEGORIES = [
  "moves",
  "coordinates",
  "notation",
  "memory",
  "practice",
] as const;
export type LearnCategory = (typeof LEARN_CATEGORIES)[number];

/**
 * The Ionicons line icon on an article's row, by its category. Line icons
 * rather than emoji so the learn list matches the practice list (see
 * `MobilePracticeModule.icon`); keyed by `string` because an article's
 * `category` is not narrowed to `LearnCategory`.
 */
export const LEARN_CATEGORY_ICONS: Record<
  string,
  keyof typeof Ionicons.glyphMap
> = {
  moves: "move-outline",
  coordinates: "locate-outline",
  notation: "create-outline",
  memory: "bulb-outline",
  practice: "barbell-outline",
};

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
