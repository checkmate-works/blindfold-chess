import Link from 'next/link';

import { FaPlus } from 'react-icons/fa';

/**
 * Shared "create new" action button for admin list pages. Renders a compact
 * plus icon plus a short label (e.g. "New") so it stays narrow on tablet
 * widths where a long "New <Resource>" label could wrap or push the header
 * layout. The surrounding page header already names the resource, so the
 * label does not need to repeat it.
 */
export function AdminNewButton({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
    >
      <FaPlus className="h-3 w-3" aria-hidden />
      {label}
    </Link>
  );
}
