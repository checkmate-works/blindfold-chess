import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/routing';

import { TEXT_LINK_CLASSES } from '@/app/[locale]/_lib/link-classes';
import type { Locale } from '@/app/[locale]/_lib/types';

import type { ProfileFeedFilter } from '../_lib/profile-feed-filters';

type Props = {
  username: string;
  locale: Locale;
  filter: ProfileFeedFilter;
};

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

  // `chunks` has no archive page of its own; the rest each have one, and the
  // unfiltered view points at posts and games together.
  const archives: { key: string; href: string; label: string }[] =
    filter === 'topics'
      ? [{ key: 'posts', href: `/u/${username}/posts`, label: t('viewAllTopics') }]
      : filter === 'problems'
        ? [
            {
              key: 'problems',
              href: `/u/${username}/problems/puzzles`,
              label: t('viewAllProblems'),
            },
          ]
        : filter === 'games'
          ? [{ key: 'games', href: `/u/${username}/games`, label: t('viewAllGames') }]
          : filter === 'all'
            ? [
                { key: 'posts', href: `/u/${username}/posts`, label: t('viewAllTopics') },
                { key: 'games', href: `/u/${username}/games`, label: t('viewAllGames') },
              ]
            : [];

  return (
    <div className="py-8 text-center">
      <p className="text-muted-foreground">{t('emptyTimeline')}</p>
      {archives.length > 0 && (
        <p className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm">
          {archives.map((archive) => (
            <Link
              key={archive.key}
              href={archive.href}
              locale={locale}
              className={TEXT_LINK_CLASSES}
            >
              {archive.label}
            </Link>
          ))}
        </p>
      )}
    </div>
  );
}
