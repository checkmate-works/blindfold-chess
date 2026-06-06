'use client';

import { useMemo, useState } from 'react';

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
 */
export function OpeningMultiSelect({ openings, selectedIds, onChange }: Props) {
  const t = useTranslations('openingSearch');
  const [search, setSearch] = useState('');
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

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
    <div className="space-y-2">
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

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('searchPlaceholder')}
        className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-link-primary"
      />

      <div className="max-h-60 overflow-y-auto rounded-md border border-border bg-card">
        {filtered.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">&mdash;</p>
        ) : (
          <ul role="listbox" aria-label={t('selectOpening')}>
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
    </div>
  );
}
