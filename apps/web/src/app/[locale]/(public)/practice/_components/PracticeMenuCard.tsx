import { Link } from '@/i18n/routing';
import { HiChevronRight } from 'react-icons/hi2';

import type { RankSlug } from '@/lib/db/data/ranks';
import type { PracticeMenuType } from '@/lib/db/practice-menu-types';

import { BeltRankBadge } from '@/app/[locale]/(public)/dojo/_components/BeltRankBadge';
import { PracticeCardVisual } from '@/app/[locale]/(public)/practice/_components/PracticeCardVisual';

type Props = {
  /** Emoji for the module, from `PRACTICE_EMOJIS`. Prefixes the title. */
  icon: string;
  title: string;
  /**
   * Which module this is — the card draws its example band from it.
   *
   * The card carries no description. The band shows the question and the
   * shape of its answer, and once it is next to the title a sentence like
   * "マスが明るいか暗いかを素早く識別する能力を鍛えます" has nothing left to add.
   */
  menuType: PracticeMenuType;
  /** Practice route, locale-prefixed by `Link`. */
  href: string;
  /**
   * The difficulty band the practice sits in ("Beginner"), shown as a small
   * line above the title. The list used to say this with a heading over
   * each group of cards; now that a filter narrows one grid instead, the
   * unfiltered grid has no other way to say which band a card is in — the
   * rank badge is the rank the practice counts toward, which is a different
   * thing, and half the cards have none.
   */
  levelLabel: string;
  /**
   * The rank this practice contributes toward, or `null` when no rank
   * requires it — then no badge is drawn. A "no rank" label is not worth the
   * space: leaving the corner empty makes the cards that do carry a rank
   * easier to pick out.
   */
  rank: { readonly slug: RankSlug; readonly label: string } | null;
  locale: string;
};

/**
 * A practice module's entry in the practice list.
 *
 * The whole card goes to the practice. The rank badge inside it is a link of
 * its own, and a link cannot be nested in a link, so the card's link is not a
 * wrapper around its content: it is an empty anchor stretched over the card
 * (`absolute inset-0`), and the badge is raised above it (`relative z-10`)
 * so a tap on the badge reaches the badge. The stretched anchor has no text,
 * so it takes its accessible name from the title.
 *
 * The chevron in the corner is the only visible trace of the link. It used
 * to be a "View details" row along the bottom, which cost every card a line
 * of height for a label that said nothing the title did not — and the card
 * already lifted on hover, promising a click it then did not honour.
 */
export function PracticeMenuCard({ icon, title, menuType, href, levelLabel, rank, locale }: Props) {
  // Stable and unique per page: every module is listed exactly once.
  const titleId = `practice-card-${menuType}-title`;

  return (
    <div className="relative flex h-full flex-col rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-1 hover:border-primary/30 focus-within:border-primary/30">
      <div className="flex min-h-7 items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{levelLabel}</p>
        {rank && (
          <div className="relative z-10 shrink-0">
            <BeltRankBadge slug={rank.slug} label={rank.label} locale={locale} />
          </div>
        )}
      </div>
      <h3 id={titleId} className="mt-1 text-base font-bold text-foreground">
        <span aria-hidden="true" className="mr-1.5">
          {icon}
        </span>
        {title}
      </h3>
      <PracticeCardVisual menuType={menuType} />
      <Link
        href={href}
        locale={locale}
        aria-labelledby={titleId}
        className="absolute inset-0 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      />
      <HiChevronRight
        aria-hidden="true"
        className="pointer-events-none absolute right-4 bottom-4 size-4 text-primary"
      />
    </div>
  );
}
