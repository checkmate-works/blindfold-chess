import { LinkTabs } from '@/app/[locale]/_components/LinkTabs';
import type { LinkTabItem } from '@/app/[locale]/_components/LinkTabs';
import type { Locale } from '@/app/[locale]/_lib/types';

import { type ProfileArchive, profileArchiveHref } from '../_lib/profile-archive-href';

type Props = {
  username: string;
  topicsCount: number;
  problemsCount: number;
  gamesCount: number;
  activeTab: ProfileArchive;
  locale: Locale;
  labels: {
    topicsTab: string;
    problemsTab: string;
    gamesTab: string;
  };
};

/**
 * Top-level Topics/Problems/Games tab row, shared by the three archive pages
 * so the tab row looks and behaves identically no matter which one renders it.
 * The timeline (the main profile page) deliberately does not carry it — see
 * `ProfileArchiveShell`.
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
