import Link from 'next/link';

import { HiChevronRight, HiMiniStar } from 'react-icons/hi2';

export type RequirementItem = {
  label: string;
} & ({ href: string } | { href?: never });

type RequirementsListProps = {
  items: (string | RequirementItem)[];
  className?: string;
  iconSize?: string;
  textSize?: string;
};

export function RequirementsList({
  items,
  className = 'space-y-2',
  iconSize = 'size-4',
  textSize = 'text-sm',
}: RequirementsListProps) {
  return (
    <ul className={className}>
      {items.map((item, i) => {
        const label = typeof item === 'string' ? item : item.label;
        const href = typeof item === 'string' ? undefined : item.href;

        return (
          <li key={i} className={`${textSize} text-foreground`}>
            {href ? (
              <Link
                href={href}
                className="block rounded-lg border border-border bg-card px-4 py-3 shadow-sm transition-colors hover:border-foreground/20"
              >
                <div className="flex items-center gap-2">
                  <HiMiniStar className={`${iconSize} shrink-0 text-amber-500`} />
                  <span className="flex-1">{label}</span>
                  <HiChevronRight
                    aria-hidden="true"
                    className="size-5 shrink-0 text-foreground/40"
                  />
                </div>
              </Link>
            ) : (
              <div className="flex items-start gap-2">
                <HiMiniStar className={`mt-0.5 ${iconSize} shrink-0 text-amber-500`} />
                <span>{label}</span>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
