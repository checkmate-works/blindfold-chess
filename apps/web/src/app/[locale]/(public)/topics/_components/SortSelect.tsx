'use client';

import { useId } from 'react';

import { useRouter } from '@/i18n/routing';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { SortMode } from '../_lib/shared';

const SORT_MODES: SortMode[] = ['new', 'popular', 'active'];

type Props = {
  basePath: string;
  /**
   * Translation namespace owning `{ new, popular, active }` option labels —
   * each topic family (openings/squares/chunks) has its own copy under
   * `topics.<family>.sort` for now.
   */
  translationKey: string;
  currentSort: SortMode;
};

/**
 * Sort switcher rendered as a native `<select>`. Replaces `SortTabs` to
 * mirror Reddit's comment/thread sort affordance, where the mode list is
 * stable but visually demoted out of the primary header. On change, the
 * page navigates so server-rendered ordering picks up the new value
 * (matches `validateSort` + `getPostsWithReplyMetaPaginatedByTopicKey`).
 * Page is intentionally reset (no `?page=N` preservation) because a
 * different sort produces a different slice and prior pagination is no
 * longer meaningful.
 */
export function SortSelect({ basePath, translationKey, currentSort }: Props) {
  const t = useTranslations(translationKey);
  const tTopics = useTranslations('topics');
  const router = useRouter();
  const selectId = useId();

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value as SortMode;
    router.push(next === 'new' ? basePath : `${basePath}?sort=${next}`);
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={selectId} className="text-sm font-medium text-muted-foreground">
        {tTopics('sortByLabel')}
      </label>
      <select
        id={selectId}
        value={currentSort}
        onChange={handleChange}
        className="rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {SORT_MODES.map((mode) => (
          <option key={mode} value={mode}>
            {t(mode)}
          </option>
        ))}
      </select>
    </div>
  );
}
