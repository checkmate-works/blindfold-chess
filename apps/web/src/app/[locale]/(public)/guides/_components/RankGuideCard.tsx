import Link from 'next/link';

import { HiArrowRight } from 'react-icons/hi2';

type RankGuideCardProps = {
  href: string;
  rankName: string;
  beltColor: string;
  description?: string;
};

/**
 * Card linking to a rank guide from the guides hub top page.
 * Visually mirrors {@link GuideLinkCard} but includes a belt-color accent bar
 * to reinforce the belt-ranking metaphor.
 */
export function RankGuideCard({ href, rankName, beltColor, description }: RankGuideCardProps) {
  return (
    <Link
      href={href}
      className="group flex items-stretch gap-4 rounded-xl border border-border bg-gradient-to-r from-card to-secondary/30 p-5 shadow-sm transition-all hover:border-foreground/20 hover:shadow-md"
    >
      <span
        aria-hidden="true"
        className="w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: beltColor }}
      />
      <div className="flex flex-1 items-center justify-between gap-3">
        <div className="space-y-1">
          <span className="text-base font-semibold text-foreground group-hover:text-foreground/90">
            {rankName}
          </span>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        <HiArrowRight
          aria-hidden="true"
          className="size-5 shrink-0 text-foreground/40 transition-transform group-hover:translate-x-0.5"
        />
      </div>
    </Link>
  );
}
