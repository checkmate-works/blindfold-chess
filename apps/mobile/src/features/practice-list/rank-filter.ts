/**
 * Which rank each practice on the practice tab belongs to, and the list
 * narrowed to one rank.
 *
 * @description
 * The rank of a practice is not decided here: it is
 * `rankForPracticeMenuType` from the shared dojo ranks, the same function
 * the web's practice badges read, so the two apps cannot file a practice
 * under different ranks. This module only translates the app's kebab-case
 * module slugs into the registry's snake_case menu types and keeps the
 * app's own display order.
 */
import {
  RANK_SLUGS,
  rankForPracticeMenuType,
  type RankSlug,
} from "@blindfold-chess/features/dojo-ranks";
import { PRACTICE_MODULE_REGISTRY } from "@blindfold-chess/features/practice-registry";

import {
  MOBILE_PRACTICE_MODULES,
  type MobilePracticeModule,
} from "../../navigation/practice-modules";

/**
 * The module's `menuType` (snake_case, as challenges and requirements name
 * it), read from the shared registry rather than rewritten from the slug.
 */
export function practiceMenuType(module: MobilePracticeModule): string {
  const entry = PRACTICE_MODULE_REGISTRY.find(
    (m) => m.slugKebab === module.slug,
  );
  // Every mobile slug is typed against the registry, so the entry exists.
  return entry?.slugSnake ?? module.slug.replace(/-/g, "_");
}

/** The rank the module belongs to, or undefined when no rank asks for it. */
export function practiceModuleRank(
  module: MobilePracticeModule,
): RankSlug | undefined {
  return rankForPracticeMenuType(practiceMenuType(module));
}

/**
 * The ranks that get a filter chip: those with at least one of `modules`,
 * lowest first (`RANK_SLUGS` order). A rank none of the app's practices
 * belongs to — 1kyu and 1dan, whose requirements are AI games — gets no
 * chip, since choosing it could only ever show an empty list.
 */
export function filterRanks(
  modules: readonly MobilePracticeModule[] = MOBILE_PRACTICE_MODULES,
): RankSlug[] {
  const present = new Set(modules.map(practiceModuleRank));
  return RANK_SLUGS.filter((rank) => present.has(rank));
}

/**
 * `modules` narrowed to `rank`, in their own order. With no rank (the "All"
 * chip) every module is kept, which is the only way a practice no rank asks
 * for is listed.
 */
export function modulesOfRank(
  rank: RankSlug | undefined,
  modules: readonly MobilePracticeModule[] = MOBILE_PRACTICE_MODULES,
): MobilePracticeModule[] {
  if (rank === undefined) return [...modules];
  return modules.filter((module) => practiceModuleRank(module) === rank);
}
