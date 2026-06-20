'use client';

import { useEffect, useRef, useState } from 'react';

import Link from 'next/link';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FiChevronDown, FiPlus } from 'react-icons/fi';

import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  locale: Locale;
  /** Position currently on the board — seeds every destination via `?fen=`. */
  currentFen: string;
  /**
   * The game's next move (SAN) from this position. Seeded as a puzzle's draft
   * solution (`?solution=`). Undefined at the final position (no continuation).
   */
  continuationSan?: string;
};

/**
 * "Create from this position ▾" — a single position-anchored entry point that
 * groups the authoring destinations a viewer can seed from the current board:
 * a chunk, a position-memory entry, or a puzzle (the latter pre-filled with the
 * game's continuation as a draft solution). Shown only to signed-in viewers;
 * each item is a plain link so the seeding contract stays in the URL.
 */
export function CreateFromPositionMenu({ locale, currentFen, continuationSan }: Props) {
  const t = useTranslations('sharedGames.create');
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

  const fen = encodeURIComponent(currentFen);
  const puzzleHref =
    `/${locale}/practice/puzzle/new?fen=${fen}` +
    (continuationSan ? `&solution=${encodeURIComponent(continuationSan)}` : '');

  // Chunk first (most common), then position-memory, then puzzle (heaviest).
  const items = [
    { key: 'chunk', label: t('chunk'), href: `/${locale}/chunks/new?fen=${fen}` },
    {
      key: 'positionMemory',
      label: t('positionMemory'),
      href: `/${locale}/practice/position-memory/new?fen=${fen}`,
    },
    { key: 'puzzle', label: t('puzzle'), href: puzzleHref },
  ];

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
      >
        <FiPlus className="h-4 w-4" aria-hidden />
        <span>{t('menuLabel')}</span>
        <FiChevronDown
          className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute z-10 mt-1 min-w-full overflow-hidden rounded-md border border-border bg-background shadow-md"
        >
          {items.map((item) => (
            <Link
              key={item.key}
              role="menuitem"
              href={item.href}
              onClick={() => setOpen(false)}
              className="block whitespace-nowrap px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
