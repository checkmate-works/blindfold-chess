'use client';

import { useTranslations } from 'next-intl';
import { FaSort } from 'react-icons/fa';
import type { GameSortOption, SortDirection } from '@/lib/types';

type Props = {
  sortBy: GameSortOption;
  sortDirection: SortDirection;
  isLoading: boolean;
  onSortChange: (value: string) => void;
};

export function SortButton({ sortBy, sortDirection, isLoading, onSortChange }: Props) {
  const t = useTranslations('home');

  return (
    <div className="flex items-center gap-3">
      <label htmlFor="sort-select" className="text-muted-foreground" aria-label={t('sortBy')}>
        <FaSort className="w-5 h-5" />
      </label>
      <select
        id="sort-select"
        value={`${sortBy}-${sortDirection}`}
        onChange={(e) => onSortChange(e.target.value)}
        disabled={isLoading}
        className="text-sm bg-card border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-foreground/20 text-foreground cursor-pointer hover:border-muted-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="lastPlayed-desc">{t('lastPlayedDesc')}</option>
        <option value="lastPlayed-asc">{t('lastPlayedAsc')}</option>
        <option value="created-desc">{t('createdDesc')}</option>
        <option value="created-asc">{t('createdAsc')}</option>
      </select>
    </div>
  );
}
