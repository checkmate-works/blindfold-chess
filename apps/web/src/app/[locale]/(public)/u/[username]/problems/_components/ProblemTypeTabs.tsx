import type { PositionKind } from '@/lib/positions/kind';

import { LinkTabs } from '@/app/[locale]/_components/LinkTabs';
import type { LinkTabItem } from '@/app/[locale]/_components/LinkTabs';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  username: string;
  activeType: PositionKind;
  puzzleCount: number;
  memoryCount: number;
  locale: Locale;
  labels: {
    puzzlesTab: string;
    positionMemoryTab: string;
  };
};

/**
 * Sub-navigation between the two problem types, sitting below the top-level
 * Problems tab. A real route per type (not a query param), matching the
 * `/u/[username]/followers` and `/achievements` precedent, so each type's
 * list is independently paginated and linkable.
 */
export function ProblemTypeTabs({
  username,
  activeType,
  puzzleCount,
  memoryCount,
  locale,
  labels,
}: Props) {
  const tabItems: LinkTabItem[] = [
    {
      value: 'puzzle',
      href: `/u/${username}/problems/puzzles`,
      label: (
        <>
          {labels.puzzlesTab} <span className="font-normal">{puzzleCount}</span>
        </>
      ),
    },
    {
      value: 'memory',
      href: `/u/${username}/problems/position-memory`,
      label: (
        <>
          {labels.positionMemoryTab} <span className="font-normal">{memoryCount}</span>
        </>
      ),
    },
  ];

  return (
    <LinkTabs
      items={tabItems}
      activeValue={activeType}
      locale={locale}
      variant="segmented"
      className="mt-4"
    />
  );
}
