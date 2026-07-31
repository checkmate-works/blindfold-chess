import type { ReactNode } from 'react';

import Link from 'next/link';

import { FaPlus } from 'react-icons/fa';
import { HiBars3 } from 'react-icons/hi2';

type Props = {
  /** Section heading ("Lines"), resolved by the caller. */
  heading: string;
  /** Owner-only "add a line" row; omit either half to hide it. */
  addLineHref?: string;
  addLineLabel?: string;
  /**
   * Owner-only "arrange" link in the heading row, out to the manage page. Sits
   * in the header rather than among the rows because it acts on the list as a
   * whole, not on any one line; omit either half to hide it.
   */
  manageHref?: string;
  manageLabel?: string;
  /** The line rows — `<li>` elements, styled by the caller. */
  children: ReactNode;
};

/**
 * Shared chrome for the repertoire's line list: a labelled, bordered card whose
 * rows are separated and scroll once the list gets long, ending with the owner's
 * "add a line" row. Both surfaces that show the list use it — the repertoire
 * detail page's sidebar (rows that unfold a move preview and drive the board)
 * and a line page's switcher (rows that link to sibling lines) — so the two read
 * as the same component with different row bodies.
 *
 * Presentational only (no hooks), so it renders from a server page or a client
 * component alike.
 */
export function LineListPanel({
  heading,
  addLineHref,
  addLineLabel,
  manageHref,
  manageLabel,
  children,
}: Props) {
  return (
    <div className="h-fit overflow-hidden rounded-lg border border-border">
      <div className="flex items-center justify-between gap-3 bg-muted/30 px-4 py-3">
        <h2 className="text-foreground">{heading}</h2>
        {manageHref && manageLabel && (
          <Link
            href={manageHref}
            className="flex flex-shrink-0 items-center gap-1 text-xs text-link-primary transition-colors hover:underline"
          >
            <HiBars3 aria-hidden className="size-3.5" />
            {manageLabel}
          </Link>
        )}
      </div>
      <ul className="max-h-[70vh] overflow-y-auto border-t border-border bg-card">
        {children}
        {addLineHref && addLineLabel && (
          <li className="border-b border-border last:border-b-0">
            <Link
              href={addLineHref}
              className="flex items-center gap-3 px-3 py-2.5 text-sm text-link-primary transition-colors hover:bg-muted"
            >
              <FaPlus aria-hidden className="size-3.5 flex-shrink-0" />
              <span className="truncate">{addLineLabel}</span>
            </Link>
          </li>
        )}
      </ul>
    </div>
  );
}
