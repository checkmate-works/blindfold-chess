import { BELT_COLOR_HEX, RANK_COLORS } from '@/lib/db/data/ranks';
import type { RankSlug } from '@/lib/db/data/ranks';

/**
 * Belt colour lookup for rank UI. Split out from the requirement / progression
 * modules because most consumers want ONLY this: the belt strip, the curriculum
 * table of contents, the rank badge and the rank card headers each need a colour
 * and nothing else about the ranking system.
 */

/** Hex for a rank's belt colour, falling back to a neutral grey for an unmapped slug. */
export function getBeltColorHex(slug: RankSlug): string {
  const colorName = RANK_COLORS[slug];
  return BELT_COLOR_HEX[colorName] ?? '#6b7280';
}

/**
 * Whether a given hex belt color should be treated as the "white belt" color.
 *
 * `#ffffff` is invisible on light backgrounds, so components rendering white
 * belts need to add a visible border / outline. Centralising the check here
 * keeps belt-color UI behaviour consistent across components.
 */
export function isWhiteBelt(beltColor: string): boolean {
  return beltColor.toLowerCase() === '#ffffff';
}
