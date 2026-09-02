import type { ReactNode } from 'react';

import { Link } from '@/i18n/routing';
import { FaThumbtack } from 'react-icons/fa';
import { HiChevronRight } from 'react-icons/hi2';

type ListLinkContainerProps = {
  children: ReactNode;
};

export function ListLinkContainer({ children }: ListLinkContainerProps) {
  return <ul className="bg-card border border-border rounded-md overflow-hidden">{children}</ul>;
}

type ListLinkProps = {
  href: string;
  icon: string;
  title: string;
  meta?: string;
  locale?: string;
  isPinned?: boolean;
  badge?: ReactNode;
};

export function ListLink({ href, icon, title, meta, locale, isPinned, badge }: ListLinkProps) {
  return (
    <li className="border-b border-border last:border-b-0 hover:bg-muted transition-colors">
      <Link href={href} locale={locale} className="block px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-xl flex-shrink-0">{icon}</span>
          <div className="flex-1 min-w-0">
            <span className="text-foreground font-medium truncate block">{title}</span>
          </div>
          {badge && (
            // `empty:hidden` collapses the chip when `badge` is a component
            // that decides for itself whether to render and returns null.
            // The `badge &&` guard above only sees that an element was
            // passed, so without this the padded chip would show as a tiny
            // empty pill whenever that component renders nothing.
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded flex-shrink-0 empty:hidden">
              {badge}
            </span>
          )}
          {isPinned && <FaThumbtack className="text-muted-foreground flex-shrink-0" />}
          {meta && <span className="text-xs text-muted-foreground flex-shrink-0">{meta}</span>}
          <HiChevronRight aria-hidden="true" className="size-4 text-foreground/40 flex-shrink-0" />
        </div>
      </Link>
    </li>
  );
}
