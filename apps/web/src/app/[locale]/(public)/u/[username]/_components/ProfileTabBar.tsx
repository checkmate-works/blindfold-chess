import { LinkTabs } from '@/app/[locale]/_components/LinkTabs';
import type { LinkTabItem } from '@/app/[locale]/_components/LinkTabs';
import type { Locale } from '@/app/[locale]/_lib/types';

import { type ProfileArchive, profileArchiveHref } from '../_lib/profile-archive-href';

type Props = {
  username: string;
  topicsCount: number;
  problemsCount: number;
  gamesCount: number;
  activeTab: 'timeline' | ProfileArchive;
  locale: Locale;
  labels: {
    timelineTab: string;
    topicsTab: string;
    problemsTab: string;
    gamesTab: string;
  };
};

/**
 * The single top-level tab row for every page under `/u/[username]`. The first
 * tab is the timeline (the main profile page); the rest are the three
 * archives.
 *
 * One row across all four pages is what makes them read as one profile: the
 * timeline used to carry filter chips in the same position instead, so a
 * reader who navigated from it to an archive saw a differently-shaped control
 * in the same place and could not tell the pages apart.
 */
export function ProfileTabBar({
  username,
  topicsCount,
  problemsCount,
  gamesCount,
  activeTab,
  locale,
  labels,
}: Props) {
  const tabItems: LinkTabItem[] = [
    {
      value: 'timeline',
      href: `/u/${username}`,
      label: labels.timelineTab,
    },
    {
      value: 'topics',
      href: profileArchiveHref(username, 'topics'),
      label: (
        <>
          {labels.topicsTab} <span className="font-normal">{topicsCount}</span>
        </>
      ),
    },
    {
      value: 'problems',
      href: profileArchiveHref(username, 'problems'),
      label: (
        <>
          {labels.problemsTab} <span className="font-normal">{problemsCount}</span>
        </>
      ),
    },
    {
      value: 'games',
      href: profileArchiveHref(username, 'games'),
      label: (
        <>
          {labels.gamesTab} <span className="font-normal">{gamesCount}</span>
        </>
      ),
    },
  ];

  return <LinkTabs items={tabItems} activeValue={activeTab} locale={locale} variant="underline" />;
}
