import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

import type { Locale } from '@/app/[locale]/_lib/types';

import {
  DEFAULT_PROFILE_FEED_FILTER,
  PROFILE_FEED_FILTERS,
  type ProfileFeedFilter,
} from '../_lib/profile-feed-filters';

type Props = {
  username: string;
  locale: Locale;
  activeFilter: ProfileFeedFilter;
};

/**
 * Locale-prefixed href for a filter. Plain `next/link` (like the pagination
 * bar) rather than the typed `@/i18n/routing` `Link`, since the query-string
 * form isn't expressible as a typed route.
 */
export function buildFilterHref(
  locale: Locale,
  username: string,
  filter: ProfileFeedFilter
): string {
  const base = `/${locale}/u/${username}`;
  return filter === DEFAULT_PROFILE_FEED_FILTER ? base : `${base}?filter=${filter}`;
}

/**
 * Filter row above the profile timeline.
 *
 * Chips rather than tabs: every chip renders the same timeline with a
 * different entity-type whitelist, so they are one control over one surface —
 * whereas the tab row genuinely navigates between separate archive pages. The
 * shape also stays honest as entity types are added; a fourth and fifth tab
 * would not.
 */
export async function ProfileFeedFilterChips({ username, locale, activeFilter }: Props) {
  const t = await getTranslations({ locale, namespace: 'publicProfile' });

  return (
    <nav className="flex flex-wrap gap-2" aria-label={t('filterAriaLabel')}>
      {PROFILE_FEED_FILTERS.map((filter) => {
        const isActive = filter === activeFilter;
        return (
          <Link
            key={filter}
            href={buildFilterHref(locale, username, filter)}
            aria-current={isActive ? 'page' : undefined}
            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              isActive
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground'
            }`}
          >
            {t(`filter.${filter}` as 'filter.all')}
          </Link>
        );
      })}
    </nav>
  );
}
