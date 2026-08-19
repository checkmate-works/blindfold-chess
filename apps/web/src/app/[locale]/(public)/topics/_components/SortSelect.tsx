'use client';

import { useId } from 'react';

import { useSearchParams } from 'next/navigation';

import { useRouter } from '@/i18n/routing';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { SORT_MODES, type SortMode } from '@/lib/sort';

type Props = {
  basePath: string;
  /**
   * Which modes to offer. Defaults to all three. Narrow it when a list has no
   * meaning for one of them — the repertoires panel has no reply activity to
   * sort by, so it offers `new` / `popular` only.
   */
  modes?: readonly SortMode[];
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
 * longer meaningful. Every other current query param is preserved, so a
 * page that also tabs via `?tab=` (e.g. the chunk detail page) stays on the
 * comments tab when the sort changes.
 */
export function SortSelect({ basePath, translationKey, currentSort, modes = SORT_MODES }: Props) {
  const t = useTranslations(translationKey);
  const tTopics = useTranslations('topics');
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectId = useId();

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value as SortMode;
    const params = new URLSearchParams(searchParams);
    // `new` is the default — drop the param rather than spell it out.
    if (next === 'new') {
      params.delete('sort');
    } else {
      params.set('sort', next);
    }
    // A new sort is a new slice; prior pagination no longer applies.
    params.delete('page');
    const query = params.toString();
    router.push(query ? `${basePath}?${query}` : basePath);
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
        {modes.map((mode) => (
          <option key={mode} value={mode}>
            {t(mode)}
          </option>
        ))}
      </select>
    </div>
  );
}
