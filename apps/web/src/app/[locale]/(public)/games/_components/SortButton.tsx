'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaSort } from 'react-icons/fa';

import type { GameSortOption, SortDirection } from '@/lib/games/saved-game-types';

type Props = {
  sortBy: GameSortOption;
  sortDirection: SortDirection;
  onSortChange: (value: string) => void;
};

export function SortButton({ sortBy, sortDirection, onSortChange }: Props) {
  const t = useTranslations('home.gameList');

  return (
    <div className="flex items-center gap-3">
      <label htmlFor="sort-select" className="text-muted-foreground" aria-label={t('sortBy')}>
        <FaSort className="w-5 h-5" />
      </label>
      <select
        id="sort-select"
        value={`${sortBy}-${sortDirection}`}
        onChange={(e) => onSortChange(e.target.value)}
        className="text-sm bg-card border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-foreground/20 text-foreground cursor-pointer hover:border-muted-foreground transition-colors"
      >
        <option value="lastPlayed-desc">{t('lastPlayedDesc')}</option>
        <option value="lastPlayed-asc">{t('lastPlayedAsc')}</option>
        <option value="created-desc">{t('createdDesc')}</option>
        <option value="created-asc">{t('createdAsc')}</option>
      </select>
    </div>
  );
}
