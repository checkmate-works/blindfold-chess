import type { TFunction } from "i18next";

/**
 * A dojo rank slug as the player reads it: `3kyu` → "3級" / "3 Kyu",
 * `1dan` → "初段" / "1 Dan". Unknown shapes are shown as they are.
 */
export function rankLabel(slug: string, t: TFunction): string {
  const match = slug.match(/^(\d+)(kyu|dan)$/);
  if (!match) return slug;
  const n = Number(match[1]);
  // ranks.kyu, ranks.dan, ranks.firstDan
  if (match[2] === "dan" && n === 1) return t("ranks.firstDan");
  return t(`ranks.${match[2]}`, { n });
}
