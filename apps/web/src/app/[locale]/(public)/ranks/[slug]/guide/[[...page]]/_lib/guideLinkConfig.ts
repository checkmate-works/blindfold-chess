import type { RankSlug } from '@/lib/db/data/ranks';

type GuideLinkKey = `${RankSlug}:${number}:${number}`;

type GuideLinkEntry = {
  /** i18n key under ranks.detail.<guideLinksKey> for the label */
  guideLinksKey: string;
  labelKey: string;
  /** Path suffix appended to /<locale>/ */
  href: string;
};

/**
 * Maps (rankSlug, pageNumber, paragraphIndex) to a guide link entry
 * rendered after that paragraph.
 */
const GUIDE_LINK_MAP: Record<GuideLinkKey, GuideLinkEntry> = {
  // 5kyu guide - Quadrant method article (page 2, last paragraph index 9)
  '5kyu:2:9': {
    guideLinksKey: '5kyuGuideLinks',
    labelKey: 'quadrantMethodArticleLabel',
    href: 'articles/switched-to-quadrant-method',
  },
  // 4kyu guide - King (page 1, last paragraph index 6)
  '4kyu:1:6': {
    guideLinksKey: '4kyuGuideLinks',
    labelKey: 'kingMovementLabel',
    href: 'learn/moves/king-movement',
  },
  // 4kyu guide - Knight (page 2, last paragraph index 4)
  '4kyu:2:4': {
    guideLinksKey: '4kyuGuideLinks',
    labelKey: 'knightMovementLabel',
    href: 'learn/moves/knight-movement',
  },
  // 4kyu guide - Bishop (page 3, last paragraph index 3)
  '4kyu:3:3': {
    guideLinksKey: '4kyuGuideLinks',
    labelKey: 'bishopMovementLabel',
    href: 'learn/moves/bishop-movement',
  },
  // 4kyu guide - Rook (page 4, paragraph index 0)
  '4kyu:4:0': {
    guideLinksKey: '4kyuGuideLinks',
    labelKey: 'rookMovementLabel',
    href: 'learn/moves/rook-movement',
  },
};

export type GuideLinkInfo = {
  label: string;
  href: string;
};

export function getGuideInlineLink(
  rankSlug: RankSlug,
  pageNumber: number,
  paragraphIndex: number,
  locale: string,
  t: (key: string) => string
): GuideLinkInfo | null {
  const key: GuideLinkKey = `${rankSlug}:${pageNumber}:${paragraphIndex}`;
  const entry = GUIDE_LINK_MAP[key];
  if (!entry) return null;

  return {
    label: t(`detail.${entry.guideLinksKey}.${entry.labelKey}`),
    href: `/${locale}/${entry.href}`,
  };
}
