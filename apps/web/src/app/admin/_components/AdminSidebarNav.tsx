'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type AdminNavLink = { href: string; label: string };
export type AdminNavGroup = { heading?: string; links: AdminNavLink[] };

/**
 * Admin sidebar navigation. Renders grouped sections and highlights the active
 * link based on the current path, giving the sidebar a "you are here" anchor
 * that complements the per-page breadcrumb (sidebar = where you can go; the
 * AdminPageHeader breadcrumb = where you are / how to go up).
 *
 * Client component: active-state detection needs `usePathname`. Link labels are
 * resolved server-side (in layout.tsx) and passed down, keeping i18n on the
 * server; group headings are plain English by the admin English-only convention.
 */
export function AdminSidebarNav({ groups }: { groups: AdminNavGroup[] }) {
  const pathname = usePathname();

  // A link is active on its own page and on any descendant (e.g. /admin/coins
  // stays active on /admin/coins/grant). The dashboard root matches exactly so
  // it isn't highlighted for every /admin/* route.
  const isActive = (href: string) =>
    href === '/admin'
      ? pathname === '/admin'
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav className="space-y-6">
      {groups.map((group, groupIndex) => (
        <div key={group.heading ?? groupIndex} className="space-y-1">
          {group.heading && (
            <div className="px-3 mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {group.heading}
            </div>
          )}
          {group.links.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={`block px-3 py-2 rounded text-sm transition-colors ${
                  active ? 'bg-background font-medium' : 'hover:bg-background'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
