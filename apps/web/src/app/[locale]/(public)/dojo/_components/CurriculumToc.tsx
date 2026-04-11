import Link from 'next/link';

import { HiCheck, HiChevronRight } from 'react-icons/hi2';

import { CURRICULUM } from '@/lib/db/data/curriculum';
import type { RankSlug } from '@/lib/db/data/ranks';

import { getBeltColorHex, isWhiteBelt } from '@/app/[locale]/(public)/ranks/_lib/helpers';

type CurriculumTocProps = {
  achievedSlugs: ReadonlySet<RankSlug>;
  nextSlug: RankSlug | null;
  rankName: (slug: RankSlug) => string;
  sectionTitle: (titleKey: string) => string;
  emptyLabel: string;
  achievedLabel: string;
  /**
   * Map from rank slug to a guide href. `null` (or missing key) means the
   * guide does not yet exist and the row should be rendered as a disabled
   * non-clickable placeholder.
   */
  guideHrefBySlug: Readonly<Partial<Record<RankSlug, string | null>>>;
};

/**
 * Zenn-style flat curriculum list for the Dojo page.
 *
 * Replaces the previous per-rank accordion with a single bordered card
 * containing a numbered flat list of sections (one row per curriculum
 * section), divided by hairlines. Each row links to its corresponding rank
 * guide when a guide exists; otherwise it renders as a muted, non-clickable
 * placeholder. Coming-soon ranks (empty `sections`) contribute a single
 * placeholder row per rank so the full curriculum outline stays visible.
 *
 * Achieved ranks get a check mark on their rows. The currently pursued
 * (`nextSlug`) rank gets a subtle background tint + left accent border.
 */
export function CurriculumToc({
  achievedSlugs,
  nextSlug,
  rankName,
  sectionTitle,
  emptyLabel,
  achievedLabel,
  guideHrefBySlug,
}: CurriculumTocProps) {
  // Flatten curriculum into a numbered row list. Empty-section ranks still
  // produce one placeholder row so users can see the full outline.
  type Row =
    | {
        kind: 'section';
        slug: RankSlug;
        title: string;
        href: string | null;
        isAchieved: boolean;
        isNext: boolean;
      }
    | {
        kind: 'placeholder';
        slug: RankSlug;
        isAchieved: boolean;
        isNext: boolean;
      };

  const rows: Row[] = [];
  for (const { slug, sections } of CURRICULUM) {
    // Mukyu is treated as always achieved — starting state every user holds.
    const isAchieved = slug === 'mukyu' || achievedSlugs.has(slug);
    const isNext = slug === nextSlug;
    const href = guideHrefBySlug[slug] ?? null;

    if (sections.length === 0) {
      rows.push({ kind: 'placeholder', slug, isAchieved, isNext });
      continue;
    }
    for (const section of sections) {
      rows.push({
        kind: 'section',
        slug,
        title: sectionTitle(section.titleKey),
        href,
        isAchieved,
        isNext,
      });
    }
  }

  return (
    <ol className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      {rows.map((row, index) => {
        const beltColor = getBeltColorHex(row.slug);
        const whiteBelt = isWhiteBelt(beltColor);
        const isFirst = index === 0;
        const numberLabel = index + 1;

        // Base row classes: divider between rows, next-rank highlight.
        const baseRowClass = [
          'relative flex items-center gap-3 px-4 py-3 text-sm',
          isFirst ? '' : 'border-t border-border',
          row.isNext ? 'bg-warning/5 border-l-2 border-l-warning' : '',
        ]
          .filter(Boolean)
          .join(' ');

        const numberEl = (
          <span className="w-6 shrink-0 text-center text-xs font-mono text-foreground/50">
            {numberLabel}
          </span>
        );

        const beltDot = (
          <span
            className="inline-block size-3 shrink-0 rounded-full"
            style={{
              backgroundColor: beltColor,
              ...(whiteBelt ? { border: '1px solid #d4d4d4' } : {}),
            }}
            aria-hidden="true"
          />
        );

        const rankBadge = (
          <span className="shrink-0 rounded bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-foreground/70">
            {rankName(row.slug)}
          </span>
        );

        const achievedMark = row.isAchieved ? (
          <HiCheck
            className="size-4 shrink-0 text-emerald-500"
            aria-label={achievedLabel}
            aria-hidden={false}
            role="img"
            data-testid="curriculum-achieved-mark"
          />
        ) : null;

        if (row.kind === 'placeholder') {
          return (
            <li
              key={`${row.slug}-placeholder`}
              className={`${baseRowClass} text-muted-foreground`}
              data-rank={row.slug}
              data-next={row.isNext ? 'true' : undefined}
              data-disabled="true"
            >
              {numberEl}
              {beltDot}
              <span className="flex-1 truncate italic">
                {rankName(row.slug)} — {emptyLabel}
              </span>
              {rankBadge}
              {achievedMark}
            </li>
          );
        }

        const content = (
          <>
            {numberEl}
            {beltDot}
            <span className="flex-1 truncate text-foreground">{row.title}</span>
            {rankBadge}
            {achievedMark}
            {row.href && (
              <HiChevronRight aria-hidden="true" className="size-4 shrink-0 text-foreground/40" />
            )}
          </>
        );

        if (row.href) {
          return (
            <li
              key={`${row.slug}-${row.title}`}
              data-rank={row.slug}
              data-next={row.isNext ? 'true' : undefined}
            >
              <Link
                href={row.href}
                className={`${baseRowClass} transition-colors hover:bg-muted/30`}
              >
                {content}
              </Link>
            </li>
          );
        }

        return (
          <li
            key={`${row.slug}-${row.title}`}
            className={`${baseRowClass} text-muted-foreground`}
            data-rank={row.slug}
            data-next={row.isNext ? 'true' : undefined}
            data-disabled="true"
          >
            {content}
          </li>
        );
      })}
    </ol>
  );
}
