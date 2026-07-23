'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

import Link from 'next/link';

import { FiMoreHorizontal } from 'react-icons/fi';

export type ActionsMenuItem = {
  key: string;
  label: string;
  href: string;
  icon?: ReactNode;
};

type Props = {
  /** Accessible label for the trigger button, e.g. translated "More actions". */
  ariaLabel: string;
  /** Plain-link entries — serializable, so server components can pass them. */
  items?: ActionsMenuItem[];
  /**
   * Custom entries rendered after `items` — e.g. action buttons that own a
   * confirmation modal. Style them with `ActionsMenuButton`. The popup is
   * hidden with CSS rather than unmounted so their state (and any portaled
   * modal) survives the popup closing.
   */
  children?: ReactNode;
};

/**
 * SNS-style "⋯" overflow menu for owner/viewer actions (edit, fork, publish,
 * delete, block) on content detail pages and user profiles. Follows the
 * established dropdown pattern from `CreateFromPositionMenu`: outside-click /
 * Escape to close, plain links as menu items so every destination stays
 * crawlable. Any click inside the popup closes it (menu semantics) — modals
 * opened by custom items live in a portal, so they are unaffected.
 */
export function ActionsMenu({ ariaLabel, items = [], children }: Props) {
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

      <div
        role="menu"
        onClick={() => setOpen(false)}
        className={`absolute right-0 z-10 mt-1 overflow-hidden rounded-md border border-border bg-background shadow-md ${open ? '' : 'hidden'}`}
      >
        {items.map((item) => (
          <Link
            key={item.key}
            role="menuitem"
            href={item.href}
            className="flex items-center gap-2 whitespace-nowrap px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
        {children}
      </div>
    </div>
  );
}

type MenuButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  /** `danger` colors the item for destructive actions (delete). */
  tone?: 'default' | 'danger';
  children: ReactNode;
};

/**
 * Button-shaped menu item for `ActionsMenu` children — same look as the link
 * items. Use for actions that open a modal instead of navigating.
 */
export function ActionsMenuButton({
  onClick,
  disabled,
  tone = 'default',
  children,
}: MenuButtonProps) {
  const toneClass =
    tone === 'danger'
      ? 'text-destructive hover:bg-destructive/10'
      : 'text-foreground hover:bg-muted';
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-2 whitespace-nowrap px-3 py-2 text-sm transition-colors disabled:opacity-50 ${toneClass}`}
    >
      {children}
    </button>
  );
}
