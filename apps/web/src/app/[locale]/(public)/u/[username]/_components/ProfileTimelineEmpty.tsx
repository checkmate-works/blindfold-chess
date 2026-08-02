import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/routing';

import { TEXT_LINK_CLASSES } from '@/app/[locale]/_lib/link-classes';
import type { Locale } from '@/app/[locale]/_lib/types';

import { type ProfileArchive, profileArchiveHref } from '../_lib/profile-archive-href';
import type { ProfileFeedFilter } from '../_lib/profile-feed-filters';

type Props = {
  username: string;
  locale: Locale;
  filter: ProfileFeedFilter;
};

/**
 * Which archives back each filter. `chunks` is the one filter with no archive
 * of its own, and `all` offers every archive there is — a member whose only
 * pre-feed content is problems would otherwise be told there is nothing while
 * their problems archive is full.
 *
 * Exhaustive over {@link ProfileFeedFilter} on purpose: a new chip has to
 * answer this question rather than silently fall through to "no archive".
 */
const ARCHIVES_BY_FILTER: Record<ProfileFeedFilter, readonly ProfileArchive[]> = {
  all: ['topics', 'problems', 'games'],
  topics: ['topics'],
  problems: ['problems'],
  games: ['games'],
  chunks: [],
};

const ARCHIVE_LABEL_KEYS = {
  topics: 'viewAllTopics',
  problems: 'viewAllProblems',
  games: 'viewAllGames',
} as const satisfies Record<ProfileArchive, string>;

/**
 * Empty state for the profile timeline.
 *
 * @design Always offers the matching archive
 * The timeline is built from `feed_items`, which only exist for activity
 * since the feed shipped — a member who was active before that has content
 * the timeline cannot show, and `challenge_rank_update` rows are reaped after
 * 30 days on top of that. So an empty timeline never means "nothing here":
 * the archives are the complete record, and every empty view must hand the
 * reader over to them. This is the one place the no-backfill decision is
 * visible to users, so it is also the place that has to absorb it.
 */
export async function ProfileTimelineEmpty({ username, locale, filter }: Props) {
  const t = await getTranslations({ locale, namespace: 'publicProfile' });

  const archives = ARCHIVES_BY_FILTER[filter];

  return (
    <div className="py-8 text-center">
      <p className="text-muted-foreground">{t('emptyTimeline')}</p>
      {archives.length > 0 && (
        <p className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm">
          {archives.map((archive) => (
            <Link
              key={archive}
              href={profileArchiveHref(username, archive)}
              locale={locale}
              className={TEXT_LINK_CLASSES}
            >
              {t(ARCHIVE_LABEL_KEYS[archive])}
            </Link>
          ))}
        </p>
      )}
    </div>
  );
}
