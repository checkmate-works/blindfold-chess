import { LinkTabs } from '@/app/[locale]/_components/LinkTabs';
import type { LinkTabItem } from '@/app/[locale]/_components/LinkTabs';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  topicsCount: number;
  problemsCount: number;
  gamesCount: number;
  activeTab: string;
  locale: Locale;
  buildTabHref: (tab: string) => string;
  labels: {
    topicsTab: string;
    problemsTab: string;
    gamesTab: string;
  };
};

/**
 * Top-level Topics/Problems/Games tab row, shared by the main profile page
 * (topics/games render in-place) and the `/problems/{puzzles,position-memory}`
 * sub-pages (problems is a separate route tree, not an in-place slot) — the
 * tab row must look and behave identically no matter which page renders it.
 */
export function ProfileTabBar({
  topicsCount,
  problemsCount,
  gamesCount,
  activeTab,
  locale,
  buildTabHref,
  labels,
}: Props) {
  const tabItems: LinkTabItem[] = [
    {
      value: 'topics',
      href: buildTabHref('topics'),
      label: (
        <>
          {labels.topicsTab} <span className="font-normal">{topicsCount}</span>
        </>
      ),
    },
    {
      value: 'problems',
      href: buildTabHref('problems'),
      label: (
        <>
          {labels.problemsTab} <span className="font-normal">{problemsCount}</span>
        </>
      ),
    },
    {
      value: 'games',
      href: buildTabHref('games'),
      label: (
        <>
          {labels.gamesTab} <span className="font-normal">{gamesCount}</span>
        </>
      ),
    },
  ];

  return <LinkTabs items={tabItems} activeValue={activeTab} locale={locale} variant="underline" />;
}
