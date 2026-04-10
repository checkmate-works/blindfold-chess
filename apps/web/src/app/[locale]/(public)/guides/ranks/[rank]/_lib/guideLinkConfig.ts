import type { RankSlug } from '@/lib/db/data/ranks';

type GuideLinkKey = `${RankSlug}:${number}:${number}`;

type GuideLinkEntry = {
  /** i18n sub-key under guides.inlineLinks.<inlineLinkKey> */
  inlineLinkKey: RankSlug;
  labelKey: string;
  /** Path suffix appended to /<locale>/ */
  href: string;
  /** Optional i18n sub-key for a lead-in paragraph shown before the card. */
  leadInKey?: string;
};

/**
 * Maps (rankSlug, pageNumber, paragraphIndex) to a guide link entry
 * rendered after that paragraph.
 */
const GUIDE_LINK_MAP: Partial<Record<GuideLinkKey, GuideLinkEntry>> = {
  // 3kyu guide - Diagonal quiz tutorial (page 1, paragraph index 1)
  '3kyu:1:1': {
    inlineLinkKey: '3kyu',
    labelKey: 'diagonalQuizTutorialLabel',
    href: 'practice/diagonal-quiz/tutorial',
  },
  // 3kyu guide - Diagonal quiz practice (page 8, paragraph index 1)
  '3kyu:8:1': {
    inlineLinkKey: '3kyu',
    labelKey: 'diagonalQuizLabel',
    href: 'practice/diagonal-quiz',
  },
  // 5kyu guide - Quadrant method article (page 2, last paragraph index 9)
  '5kyu:2:9': {
    inlineLinkKey: '5kyu',
    labelKey: 'quadrantMethodArticleLabel',
    href: 'articles/switched-to-quadrant-method',
  },
  // 4kyu guide - King (page 1, last paragraph index 6)
  '4kyu:1:6': {
    inlineLinkKey: '4kyu',
    labelKey: 'kingMovementLabel',
    href: 'learn/moves/king-movement',
  },
  // 4kyu guide - Knight (page 2, last paragraph index 4)
  '4kyu:2:4': {
    inlineLinkKey: '4kyu',
    labelKey: 'knightMovementLabel',
    href: 'learn/moves/knight-movement',
  },
  // 4kyu guide - Bishop (page 3, last paragraph index 3)
  '4kyu:3:3': {
    inlineLinkKey: '4kyu',
    labelKey: 'bishopMovementLabel',
    href: 'learn/moves/bishop-movement',
  },
  // 4kyu guide - Rook (page 4, paragraph index 0)
  '4kyu:4:0': {
    inlineLinkKey: '4kyu',
    labelKey: 'rookMovementLabel',
    href: 'learn/moves/rook-movement',
  },
  // Mukyu guide - Learn about algebraic notation (page 1, paragraph 3)
  'mukyu:1:3': {
    inlineLinkKey: 'mukyu',
    labelKey: 'learnArticleLabel',
    href: 'learn/notation/algebraic-notation',
    leadInKey: 'learnArticle',
  },
  // Mukyu guide - Coordinate quiz (page 2, paragraph 1)
  'mukyu:2:1': {
    inlineLinkKey: 'mukyu',
    labelKey: 'coordinateQuizLabel',
    href: 'practice/coordinate-quiz',
  },
  // Mukyu guide - Coordinate confusion article (page 2, paragraph 3)
  'mukyu:2:3': {
    inlineLinkKey: 'mukyu',
    labelKey: 'coordinateConfusionLabel',
    href: 'learn/coordinates/coordinate-confusion',
  },
  // Mukyu guide - Quadrants practice (page 3, paragraph 0)
  'mukyu:3:0': {
    inlineLinkKey: 'mukyu',
    labelKey: 'quadrantsLabel',
    href: 'practice/quadrants',
  },
  // Mukyu guide - 5kyu guide link (page 3, paragraph 2)
  'mukyu:3:2': {
    inlineLinkKey: 'mukyu',
    labelKey: '5kyuGuideLabel',
    href: 'guides/ranks/5kyu',
  },
};

export type GuideLinkInfo = {
  label: string;
  href: string;
  leadIn?: string;
};

export function getGuideInlineLink(
  rankSlug: RankSlug,
  pageNumber: number,
  paragraphIndex: number,
  locale: string,
  tGuides: (key: string) => string
): GuideLinkInfo | null {
  const key: GuideLinkKey = `${rankSlug}:${pageNumber}:${paragraphIndex}`;
  const entry = GUIDE_LINK_MAP[key];
  if (!entry) return null;

  return {
    label: tGuides(`inlineLinks.${entry.inlineLinkKey}.${entry.labelKey}`),
    href: `/${locale}/${entry.href}`,
    leadIn: entry.leadInKey
      ? tGuides(`inlineLinks.${entry.inlineLinkKey}.${entry.leadInKey}`)
      : undefined,
  };
}
