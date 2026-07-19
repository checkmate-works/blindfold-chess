'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

import Link from 'next/link';

import { FiMoreHorizontal } from 'react-icons/fi';

export type PositionActionsMenuItem = {
  key: string;
  label: string;
  href: string;
  icon?: ReactNode;
};

type Props = {
  /** Accessible label for the trigger button, e.g. translated "More actions". */
  ariaLabel: string;
  /** Menu entries. The caller renders this component only when non-empty. */
  items: PositionActionsMenuItem[];
};

/**
 * SNS-style "⋯" overflow menu for owner/viewer actions (edit, fork) on
 * position detail pages. Follows the established dropdown pattern from
 * `CreateFromPositionMenu`: outside-click / Escape to close, plain links as
 * menu items so every destination stays crawlable.
 */
export function PositionActionsMenu({ ariaLabel, items }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape while open.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <FiMoreHorizontal className="h-5 w-5" aria-hidden />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-10 mt-1 overflow-hidden rounded-md border border-border bg-background shadow-md"
        >
          {items.map((item) => (
            <Link
              key={item.key}
              role="menuitem"
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 whitespace-nowrap px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
