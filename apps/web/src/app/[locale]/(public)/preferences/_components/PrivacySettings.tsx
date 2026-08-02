'use client';

import { useEffect, useState, useTransition } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { Skeleton } from '@/app/[locale]/_components/Skeleton';

import { getLeaderboardVisibility, setLeaderboardVisibility } from '../_actions';

/**
 * Shaped identically to the real toggle row below (same `py-3` height, same
 * `h-5 w-9` switch footprint) so nothing shifts once
 * `getLeaderboardVisibility` resolves and the real row replaces this.
 */
function PrivacySettingsSkeleton() {
  return (
    <ul className="divide-y divide-border">
      <li className="flex items-center justify-between gap-3 py-3">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-5 w-9 shrink-0 rounded-full" />
      </li>
    </ul>
  );
}

/**
 * Privacy tab — currently a single toggle (leaderboard opt-out; see the
 * `hiddenFromLeaderboard` column TSDoc in schema/auth.ts for its design).
 *
 * The tab is named for the category rather than the one setting it holds
 * today, so later per-account privacy controls — blocking-list management,
 * and profile hiding if that is ever built — have a home that does not
 * require renaming the tab or moving the URL (`?tab=privacy`).
 */
export function PrivacySettings() {
  const t = useTranslations('Preferences');
  // null = still loading the current value; boolean = loaded (true = hidden).
  const [hidden, setHidden] = useState<boolean | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    getLeaderboardVisibility().then((value) => {
      if (!cancelled) setHidden(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function toggle() {
    if (hidden === null) return;
    const next = !hidden;
    setHidden(next);

    startTransition(async () => {
      await setLeaderboardVisibility(next);
    });
  }

  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">{t('privacy.description')}</p>
      {hidden === null ? (
        <PrivacySettingsSkeleton />
      ) : (
        <ul className="divide-y divide-border">
          <li className="py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-foreground">{t('privacy.hideFromLeaderboard')}</span>
              <button
                type="button"
                role="switch"
                aria-checked={hidden}
                aria-label={t('privacy.hideFromLeaderboard')}
                onClick={toggle}
                className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                  hidden ? 'bg-success' : 'bg-muted'
                }`}
              >
                <span
                  className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                    hidden ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {t('privacy.hideFromLeaderboardHelp')}
            </p>
          </li>
        </ul>
      )}
    </div>
  );
}
