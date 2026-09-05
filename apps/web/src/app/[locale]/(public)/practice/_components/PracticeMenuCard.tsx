import { Link } from '@/i18n/routing';
import { HiChevronRight } from 'react-icons/hi2';

import type { RankSlug } from '@/lib/db/data/ranks';

import { BeltRankBadge } from '@/app/[locale]/(public)/dojo/_components/BeltRankBadge';

type Props = {
  /** Emoji for the module, from `PRACTICE_EMOJIS`. Prefixes the title. */
  icon: string;
  title: string;
  /**
   * One line on what the practice trains. This is the card's substitute for a
   * worked example: most modules ask about a whole board position, which does
   * not survive being shrunk to a thumbnail the way a hand of tiles does, so
   * the card says what the practice is instead of showing it.
   */
  description: string;
  /** Practice route, locale-prefixed by `Link`. */
  href: string;
  /**
   * The rank this practice contributes toward, or `null` when no rank
   * requires it — then no badge is drawn. A "no rank" label is not worth the
   * space: leaving the corner empty makes the cards that do carry a rank
   * easier to pick out.
   */
  rank: { readonly slug: RankSlug; readonly label: string } | null;
  locale: string;
  /** Wording of the card's own link ("View details"). */
  detailLabel: string;
};

/**
 * A practice module's entry in the practice list.
 *
 * The card itself is not a link. The rank badge inside it is one, and a link
 * cannot be nested in a link, so the card's destination is the explicit
 * "View details" row at the bottom — the badge and the practice are two
 * different places to go, and the card has to be able to offer both.
 */
export function PracticeMenuCard({
  icon,
  title,
  description,
  href,
  rank,
  locale,
  detailLabel,
}: Props) {
  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-1 hover:border-primary/30">
      <div>
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-bold text-foreground">
            <span aria-hidden="true" className="mr-1.5">
              {icon}
            </span>
            {title}
          </h3>
          {rank && (
            <div className="shrink-0">
              <BeltRankBadge slug={rank.slug} label={rank.label} locale={locale} />
            </div>
          )}
        </div>
        {/* Two lines at most, so a long description cannot push one card's
            link row out of line with its neighbour's in the grid. */}
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="mt-4 flex justify-end">
        <Link
          href={href}
          locale={locale}
          className="flex items-center text-sm font-bold text-primary transition-opacity hover:opacity-80"
        >
          {detailLabel}
          <HiChevronRight aria-hidden="true" className="ml-1 size-4" />
        </Link>
      </div>
    </div>
  );
}
