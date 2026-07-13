'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { OpeningOption } from '@/lib/repertoires/opening-queries';

type Props = {
  openings: OpeningOption[];
  /** Selected opening ids (n:n — a transposing repertoire may name several). */
  selectedIds: string[];
  onChange: (ids: string[]) => void;
};

/**
 * Searchable multi-select over the `chess_openings` master, modelled on
 * `OpeningSearch` but allowing several picks (the repertoire ↔ opening link is
 * n:n). Selected openings show as removable chips above the search box.
 *
 * The option list is a popover: closed until the search box is focused, so the
 * form reads as a short field rather than a wall of openings — and so the
 * PGN-derived chips stay visible without scrolling. It stays open across picks
 * (a repertoire may name several) and closes on Escape or an outside click.
 */
export function OpeningMultiSelect({ openings, selectedIds, onChange }: Props) {
  const t = useTranslations('openingSearch');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  const filtered = useMemo(() => {
    if (!search.trim()) return openings;
    const lower = search.toLowerCase();
    return openings.filter(
      (o) =>
        o.translatedName.toLowerCase().includes(lower) ||
        o.name.toLowerCase().includes(lower) ||
        o.ecoCode.toLowerCase().includes(lower) ||
        o.slug.toLowerCase().includes(lower)
    );
  }, [openings, search]);

  function add(id: string) {
    if (!selected.has(id)) onChange([...selectedIds, id]);
  }
  function remove(id: string) {
    onChange(selectedIds.filter((s) => s !== id));
  }

  return (
    <div ref={containerRef} className="space-y-2">
      {selectedIds.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {selectedIds.map((id) => {
            const o = openings.find((x) => x.id === id);
            if (!o) return null;
            return (
              <li
                key={id}
                className="flex items-center gap-1 rounded-full bg-link-primary/10 px-2.5 py-1 text-xs text-foreground"
              >
                <span>{o.translatedName}</span>
                <button
                  type="button"
                  onClick={() => remove(id)}
                  aria-label={`${o.translatedName} ×`}
                  className="text-muted-foreground hover:text-red-600"
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false);
          }}
          role="combobox"
          aria-expanded={open}
          aria-controls="opening-multiselect-listbox"
          placeholder={t('searchPlaceholder')}
          className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-link-primary"
        />

        {open && (
          <div className="absolute inset-x-0 top-full z-10 mt-1 max-h-60 overflow-y-auto rounded-md border border-border bg-card shadow-lg">
            {filtered.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">&mdash;</p>
            ) : (
              <ul id="opening-multiselect-listbox" role="listbox" aria-label={t('selectOpening')}>
                {filtered.map((o) => {
                  const isSelected = selected.has(o.id);
                  return (
                    <li key={o.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => add(o.id)}
                        disabled={isSelected}
                        className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted ${
                          isSelected
                            ? 'cursor-not-allowed bg-link-primary/10 font-medium text-link-primary opacity-60'
                            : 'text-foreground'
                        }`}
                      >
                        <span className="truncate">{o.translatedName}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{o.ecoCode}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
