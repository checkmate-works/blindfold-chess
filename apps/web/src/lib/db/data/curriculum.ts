/**
 * Curriculum table of contents data.
 *
 * Defines the study sections associated with each rank, used by the Dojo page
 * to render a per-rank accordion table of contents. Section titles are
 * resolved via i18n keys under `dojo.curriculum.sections.<titleKey>`.
 *
 * Ranks with empty `sections` are rendered with a "coming soon" indicator.
 */
import type { RankSlug } from './ranks';

export type CurriculumSection = {
  /** i18n key under `dojo.curriculum.sections` */
  titleKey: string;
  // NOTE: Future work may add sub-pages beneath a section (e.g., separate
  // guide chapters under "Computing diagonals and anti-diagonals"). When that
  // happens, this type will likely grow a `children?: readonly CurriculumSection[]`
  // or `pages?: readonly CurriculumPage[]` field. Keep additions backward
  // compatible so existing consumers continue to render the flat list.
};

export type CurriculumRank = {
  slug: RankSlug;
  sections: readonly CurriculumSection[];
};

export const CURRICULUM: readonly CurriculumRank[] = [
  { slug: 'mukyu', sections: [{ titleKey: 'algebraicNotation' }] },
  { slug: '5kyu', sections: [{ titleKey: 'anchorPoints' }] },
  { slug: '4kyu', sections: [{ titleKey: 'blindfoldLegalMoves' }] },
  { slug: '3kyu', sections: [{ titleKey: 'diagonals' }] },
  { slug: '2kyu', sections: [] },
  { slug: '1kyu', sections: [] },
  { slug: '1dan', sections: [] },
] as const;
