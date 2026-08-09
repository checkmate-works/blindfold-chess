import { getTranslations } from 'next-intl/server';

import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  locale: Locale;
};

/**
 * Empty state for the profile timeline.
 *
 * @design Message only — no archive links
 * The timeline is built from `feed_items`, which only exist for activity since
 * the feed shipped, and `challenge_rank_update` rows are reaped after 30 days
 * on top of that — so an empty timeline never means "nothing here", and the
 * archives are the complete record. This used to spell that out with a row of
 * "View all posts / problems / games" links. They were removed (2026-08): the
 * tab row above is always mounted and leads to the same three archives, so the
 * links restated navigation the reader already has, directly under a line
 * saying there is nothing to show.
 */
export async function ProfileTimelineEmpty({ locale }: Props) {
  const t = await getTranslations({ locale, namespace: 'publicProfile' });

  return (
    <div className="py-8 text-center">
      <p className="text-muted-foreground">{t('emptyTimeline')}</p>
    </div>
  );
}
