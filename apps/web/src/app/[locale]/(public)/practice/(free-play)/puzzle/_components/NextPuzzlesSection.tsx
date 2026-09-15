import { Link } from '@/i18n/routing';

import type { Position } from '@/lib/db/schema';

import { SectionTitle } from '@/app/[locale]/_components';
import { TEXT_LINK_MUTED_CLASSES } from '@/app/[locale]/_lib/link-classes';
import type { Locale } from '@/app/[locale]/_lib/types';

import { NextPuzzleCard } from './NextPuzzleCard';

type Props = {
  puzzles: Pick<Position, 'id' | 'fen' | 'title'>[];
  locale: Locale;
  labels: {
    sectionTitle: string;
    whiteToMove: string;
    blackToMove: string;
  };
  /**
   * The same-author list link that used to stand alone under the attribution
   * row. Rendered as the section's header action so the cards (author-first)
   * and the "see all" destination read as one unit. Omitted for puzzles
   * whose author has no public profile.
   */
  authorLink?: {
    href: string;
    label: string;
  };
};

/**
 * "Next puzzle" grid on the result screen: up to four tappable board
 * thumbnails so a solver can go straight to another puzzle without the
 * detour through the list. Four tiles lay out as one row on desktop and two
 * rows of two on a phone, which keeps the section short enough that the
 * action buttons below stay within reach.
 *
 * Renders nothing when there are no candidates, so the heading never sits
 * over an empty grid.
 */
export function NextPuzzlesSection({ puzzles, locale, labels, authorLink }: Props) {
  if (puzzles.length === 0) return null;

  return (
    <section className="space-y-3">
      <SectionTitle>
        <span className="flex items-baseline justify-between gap-3">
          <span>{labels.sectionTitle}</span>
          {authorLink && (
            <Link
              href={authorLink.href}
              locale={locale}
              className={`shrink-0 text-sm font-normal ${TEXT_LINK_MUTED_CLASSES}`}
            >
              {authorLink.label}
            </Link>
          )}
        </span>
      </SectionTitle>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {puzzles.map((puzzle) => (
          <li key={puzzle.id}>
            <NextPuzzleCard
              id={puzzle.id}
              fen={puzzle.fen}
              title={puzzle.title}
              locale={locale}
              labels={labels}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
