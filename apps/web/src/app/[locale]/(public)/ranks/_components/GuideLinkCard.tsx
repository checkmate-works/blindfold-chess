import Link from 'next/link';

import { HiArrowRight } from 'react-icons/hi2';

export type GuideLinkItem = {
  label: string;
  href: string;
  description?: string;
};

type GuideLinkCardProps = {
  items: GuideLinkItem[];
  className?: string;
};

/**
 * Taller link card component for guide pages.
 *
 * Visually distinct from RequirementsList (used for challenge score links)
 * to communicate that these are informational/learning resources rather
 * than rank advancement requirements.
 */
export function GuideLinkCard({ items, className = 'space-y-3' }: GuideLinkCardProps) {
  return (
    <div className={className}>
      {items.map((item, i) => (
        <Link
          key={i}
          href={item.href}
          className="group block rounded-xl border border-border bg-gradient-to-r from-card to-secondary/30 px-5 py-5 shadow-sm transition-all hover:border-foreground/20 hover:shadow-md"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-base font-semibold text-foreground group-hover:text-foreground/90">
                {item.label}
              </span>
              {item.description && (
                <p className="text-sm text-muted-foreground">{item.description}</p>
              )}
            </div>
            <HiArrowRight
              aria-hidden="true"
              className="size-5 shrink-0 text-foreground/40 transition-transform group-hover:translate-x-0.5"
            />
          </div>
        </Link>
      ))}
    </div>
  );
}
