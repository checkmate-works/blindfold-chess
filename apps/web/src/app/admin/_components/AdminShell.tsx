'use client';

import { type ReactNode, useEffect, useState } from 'react';

import { usePathname } from 'next/navigation';

import { FaBars, FaTimes } from 'react-icons/fa';

import { ThemeToggle } from './ThemeToggle';

/**
 * Client shell for the admin layout. On large screens (`lg` and up) the sidebar
 * is a static 224px column, unchanged from before. Below `lg` (tablet / small
 * windows) it collapses into an off-canvas drawer toggled by a hamburger button
 * in the header, so the narrow content column is no longer permanently squeezed
 * by the sidebar. Phones are out of scope but inherit the same drawer.
 *
 * The sidebar content (logo, title, nav) is rendered server-side in layout.tsx
 * and passed in via `sidebar`, keeping i18n resolution on the server. This
 * component only owns the open/closed state and the responsive chrome.
 */
export function AdminShell({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Auto-close the drawer after navigating to another admin page.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on Escape for keyboard users while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="flex min-h-screen">
      {/* Backdrop — tablet/phone only, and only while the drawer is open. */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          aria-hidden
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-56 overflow-y-auto border-r border-border bg-secondary p-4 transition-transform lg:static lg:z-auto lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-md hover:bg-background lg:hidden"
        >
          <FaTimes className="h-4 w-4" />
        </button>
        {sidebar}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border p-4 lg:justify-end">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border transition-colors hover:bg-secondary lg:hidden"
          >
            <FaBars className="h-5 w-5" />
          </button>
          <ThemeToggle />
        </header>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
