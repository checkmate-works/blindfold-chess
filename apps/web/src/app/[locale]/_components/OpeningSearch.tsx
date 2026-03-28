'use client';

import { useMemo, useState } from 'react';

import { useTranslations } from 'next-intl';

export type Opening = {
  slug: string;
  name: string;
  fen: string;
  ecoCode: string;
  pgn: string;
  translatedName: string;
};

type Props = {
  openings: Opening[];
  selectedSlug: string;
  onSelect: (slug: string) => void;
};

export function OpeningSearch({ openings, selectedSlug, onSelect }: Props) {
  const t = useTranslations('openingSearch');
  const [search, setSearch] = useState('');

  const filteredOpenings = useMemo(() => {
    if (!search.trim()) return openings;
    const lower = search.toLowerCase();
    return openings.filter(
      (o) =>
        o.translatedName.toLowerCase().includes(lower) ||
        o.name.toLowerCase().includes(lower) ||
        o.slug.toLowerCase().includes(lower)
    );
  }, [openings, search]);

  return (
    <div className="space-y-2">
      <label htmlFor="opening-search" className="block text-sm font-medium text-foreground">
        {t('selectOpening')}
      </label>

      <input
        id="opening-search"
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('searchPlaceholder')}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
      />

      <div className="max-h-60 overflow-y-auto rounded-md border border-border bg-background">
        {filteredOpenings.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">&mdash;</p>
        ) : (
          <ul role="listbox" aria-label={t('selectOpening')}>
            {filteredOpenings.map((opening) => (
              <li key={opening.slug}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selectedSlug === opening.slug}
                  onClick={() => onSelect(opening.slug)}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-muted ${
                    selectedSlug === opening.slug
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-foreground'
                  }`}
                >
                  {opening.translatedName}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
