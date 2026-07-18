import Link from 'next/link';

import { HiCheck } from 'react-icons/hi2';

import { CURRICULUM } from '@/lib/db/data/curriculum';
import { ALL_RANK_SLUGS } from '@/lib/db/data/ranks';
import type { RankSlug } from '@/lib/db/data/ranks';

import { getBeltColorHex, isWhiteBelt } from '@/app/[locale]/(public)/ranks/_lib/helpers';
import { TEXT_LINK_CLASSES } from '@/app/[locale]/_lib/link-classes';

type CurriculumTocProps = {
  /**
   * Set of rank slugs the user has already achieved. When omitted, the
   * component renders in plain mode and does not show any achievement
   * markers.
   */
  achievedSlugs?: ReadonlySet<RankSlug>;
  /**
   * Slug of the rank the user is currently pursuing. When omitted, no row
   * is highlighted as "next" and no data-next attribute is set.
   */
  nextSlug?: RankSlug | null;
  /**
   * Optional truncation cutoff. When provided, ranks with a level greater
   * than this slug's level (based on `ALL_RANK_SLUGS` ordering) are hidden.
   * When omitted, every rank is rendered.
   */
  maxVisibleSlug?: RankSlug | null;
  rankName: (slug: RankSlug) => string;
  sectionTitle: (titleKey: string) => string;
  achievedLabel: string;
  /**
   * Map from rank slug to a guide href. `null` (or missing key) means the
   * guide does not yet exist and the row should be rendered as a disabled
   * non-clickable placeholder.
   */
  guideHrefBySlug: Readonly<Partial<Record<RankSlug, string | null>>>;
};

/**
 * Zenn-chapter-style curriculum list.
 *
 * Plain vertical list (no outer card, no row dividers). Each row is a
 * two-line entry: a small muted rank-name label on top, and the curriculum
 * section title below, with a small belt-colored bullet on the left. Only
 * the section title text is a `<Link>` — the bullet and rank name label
 * remain non-interactive. Ranks whose guide does not yet exist render the
 * section title as plain text; ranks with NO curriculum sections at all are
 * omitted entirely — a rank without study material is not advertised as
 * "coming soon" anywhere (there is no roadmap value in an empty promise,
 * and ranks are earnable without it under skip-grants anyway).
 *
 * A vertical dashed line runs down the left side of the list, visually
 * connecting the belt-colored bullet dots (book-spine effect). The line is
 * clamped to start at the first bullet's vertical center and end at the
 * last bullet's vertical center, sitting behind the dots.
 *
 * The component has two usage modes:
 *
 * - **User-aware (Dojo):** pass `achievedSlugs`, `nextSlug`, and optionally
 *   `maxVisibleSlug` to show achievement marks, highlight the next rank,
 *   and truncate the list to the current progression.
 * - **Plain (Guides):** omit `achievedSlugs` and `nextSlug` to render the
 *   full curriculum as a content index, with no check marks and no
 *   highlight.
 */
export function CurriculumToc({
  achievedSlugs,
  nextSlug,
  maxVisibleSlug,
  rankName,
  sectionTitle,
  achievedLabel,
  guideHrefBySlug,
}: CurriculumTocProps) {
  type Row = {
    slug: RankSlug;
    title: string;
    href: string | null;
    isAchieved: boolean;
    isNext: boolean;
  };

  // Resolve the maximum visible rank level (inclusive). Undefined means no
  // truncation. We look up positions via ALL_RANK_SLUGS so the component is
  // agnostic to the numeric `level` field on rank seed data.
  const maxVisibleIndex = maxVisibleSlug != null ? ALL_RANK_SLUGS.indexOf(maxVisibleSlug) : -1;

  const rows: Row[] = [];
  for (const { slug, sections } of CURRICULUM) {
    if (maxVisibleSlug != null) {
      const slugIndex = ALL_RANK_SLUGS.indexOf(slug);
      if (slugIndex === -1 || slugIndex > maxVisibleIndex) {
        continue;
      }
    }

    // Mukyu is treated as always achieved — starting state every user holds.
    const isAchieved = achievedSlugs != null ? slug === 'mukyu' || achievedSlugs.has(slug) : false;
    const isNext = nextSlug != null && slug === nextSlug;
    const href = guideHrefBySlug[slug] ?? null;

    // A rank with no curriculum sections has nothing to list — omit it
    // rather than advertising an empty "coming soon" row.
    if (sections.length === 0) continue;

    for (const section of sections) {
      rows.push({
        slug,
        title: sectionTitle(section.titleKey),
        href,
        isAchieved,
        isNext,
      });
    }
  }

  // Vertical offset from the top of each row to the vertical center of the
  // belt bullet. Derived from the row's padding + the bullet's own offset:
  //   py-3 (12px top padding) + mt-1.5 (6px) + half of size-2.5 (5px) = 23px.
  // Because every row shares the same padding, the first bullet's center is
  // this many pixels from the top of the <ol>, and the last bullet's center
  // is the same offset from the bottom. We use these to clamp the dashed
  // line so it does not extend past the first/last dot.
  const BULLET_CENTER_OFFSET_PX = 23;
  // Horizontal offset from the left of the <ol> to the vertical center of
  // the belt bullet. pl-3 (12px) + half of size-2.5 (5px) = 17px.
  const BULLET_CENTER_LEFT_PX = 17;

  return (
    <ol className="relative flex flex-col">
      <span
        aria-hidden="true"
        data-testid="curriculum-dashed-line"
        className="pointer-events-none absolute border-l border-dashed border-border"
        style={{
          left: `${BULLET_CENTER_LEFT_PX}px`,
          top: `${BULLET_CENTER_OFFSET_PX}px`,
          bottom: `${BULLET_CENTER_OFFSET_PX}px`,
        }}
      />
      {rows.map((row) => {
        const beltColor = getBeltColorHex(row.slug);
        const whiteBelt = isWhiteBelt(beltColor);

        const baseRowClass = [
          'relative flex items-start gap-3 py-3 pl-3 pr-2',
          row.isNext
            ? 'border-l-2 border-l-warning bg-warning/5'
            : 'border-l-2 border-l-transparent',
        ].join(' ');

        const beltDot = (
          <span
            className="relative z-10 mt-1.5 inline-block size-2.5 shrink-0 rounded-full"
            style={{
              backgroundColor: beltColor,
              ...(whiteBelt ? { border: '1px solid #d4d4d4' } : {}),
            }}
            aria-hidden="true"
            data-testid="curriculum-belt-dot"
            data-belt-color={beltColor}
          />
        );

        const achievedMark = row.isAchieved ? (
          <HiCheck
            className="mt-1 size-4 shrink-0 text-emerald-500"
            aria-label={achievedLabel}
            aria-hidden={false}
            role="img"
            data-testid="curriculum-achieved-mark"
          />
        ) : null;

        const titleLink = row.href ? (
          <Link href={row.href} className={`text-sm ${TEXT_LINK_CLASSES}`}>
            {row.title}
          </Link>
        ) : (
          <span className="text-sm text-muted-foreground">{row.title}</span>
        );

        return (
          <li
            key={`${row.slug}-${row.title}`}
            className={baseRowClass}
            data-rank={row.slug}
            data-next={row.isNext ? 'true' : undefined}
            data-disabled={row.href ? undefined : 'true'}
          >
            {beltDot}
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">{rankName(row.slug)}</span>
              {titleLink}
            </span>
            {achievedMark}
          </li>
        );
      })}
    </ol>
  );
}
