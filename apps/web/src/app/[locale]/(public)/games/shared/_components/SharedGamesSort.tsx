'use client';

import { useId } from 'react';

import { useRouter } from '@/i18n/routing';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { SHARED_GAMES_SORT_MODES, type SharedGamesSortMode } from '../_lib/sort';

type Props = {
  currentSort: SharedGamesSortMode;
};

/**
 * Sort switcher for the shared-games gallery, a native `<select>` matching the
 * topics `SortSelect` affordance. On change the page navigates so the
 * server-rendered ordering picks up the new mode ('new' drops the param).
 */
export function SharedGamesSort({ currentSort }: Props) {
  const t = useTranslations('sharedGames');
  const router = useRouter();
  const selectId = useId();

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value as SharedGamesSortMode;
    router.push(next === 'new' ? '/games/shared' : `/games/shared?sort=${next}`);
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={selectId} className="text-sm font-medium text-muted-foreground">
        {t('list.sortBy')}
      </label>
      <select
        id={selectId}
        value={currentSort}
        onChange={handleChange}
        className="rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {SHARED_GAMES_SORT_MODES.map((mode) => (
          <option key={mode} value={mode}>
            {t(`list.sort.${mode}`)}
          </option>
        ))}
      </select>
    </div>
  );
}
