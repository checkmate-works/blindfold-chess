'use client';

import { Fragment, type ReactNode, Suspense } from 'react';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { PracticeLevelDots } from '@/app/[locale]/(public)/practice/_components/PracticeLevelDots';
import {
  PRACTICE_LEVELS,
  type PracticeLevel,
  isPracticeLevel,
} from '@/app/[locale]/(public)/practice/_lib/practice-levels';

/** Query key carrying the selected level (`/practice?level=beginner`). */
export const PRACTICE_LEVEL_PARAM = 'level';

/** One card, already rendered on the server, plus the level it belongs to. */
export type PracticeLevelFilterItem = {
  readonly key: string;
  readonly level: PracticeLevel;
  readonly card: ReactNode;
};

type Props = {
  readonly items: readonly PracticeLevelFilterItem[];
  /** `/<locale>/practice` — the list's own URL, which the options link back to. */
  readonly basePath: string;
  /** Label for each level, in the order the options should appear. */
  readonly levelLabels: Readonly<Record<PracticeLevel, string>>;
  /** Wording of the "no filter" option. */
  readonly allLabel: string;
  /** Accessible name of the option group ("練習を絞り込む"). */
  readonly filterLabel: string;
  /** Heading for the list itself. Not shown — it only fills the heading level. */
  readonly listHeading: string;
};

type ListProps = Props & {
  /** The level in the URL, or `undefined` for the unfiltered list. */
  readonly selected: PracticeLevel | undefined;
};

function FilteredList({
  items,
  basePath,
  levelLabels,
  allLabel,
  filterLabel,
  listHeading,
  selected,
}: ListProps) {
  const visible = selected ? items.filter((item) => item.level === selected) : items;
  const options: { level?: PracticeLevel; label: string }[] = [
    { label: allLabel },
    ...PRACTICE_LEVELS.map((level) => ({ level, label: levelLabels[level] })),
  ];

  return (
    <div className="space-y-6">
      {/* The per-level headings this filter replaced were the page's only h2.
          One stays, for screen readers, so the module titles are not h3s
          hanging directly off the page's h1. */}
      <h2 className="sr-only">{listHeading}</h2>

      {/* The selected option is a raised card surface, as in every other
          segmented control here (`tabItemClass('segmented')`), not a primary
          fill: primary is the colour of the buttons that do things, and a
          filter option painted like one reads as a call to action rather
          than a state.

          Two rows of three on a phone, one row from `md` up. Six options —
          five bands and "All" — do not fit a phone in any locale: English
          alone needs ~450px of labels against ~330px of room. The row used
          to scroll, which hid the last two options behind a swipe and, worse,
          invited fixing the width by merging bands instead (see
          `PRACTICE_LEVELS`). Wrapping shows all six at once for the price of
          one line of height, and six divides evenly into two rows of three.

          The wide layout wraps too rather than squeezing: with `flex-wrap`,
          a row that runs out of room takes a second line instead of shrinking
          every option until the shortest one clips — "All" was the first to
          lose its letters, which reads as a rendering fault rather than a
          tight fit. In the phone grid, where the three columns are fixed, a
          label longer than its column truncates instead of widening the
          block. The dots stack above the label on phones and sit beside it
          from `md` up. */}
      <div
        role="group"
        aria-label={filterLabel}
        className="grid grid-cols-3 gap-1 rounded-lg bg-secondary p-1 md:flex md:flex-wrap"
      >
        {options.map((option) => {
          const isActive = option.level === selected;
          return (
            <Link
              key={option.label}
              href={option.level ? `${basePath}?${PRACTICE_LEVEL_PARAM}=${option.level}` : basePath}
              // The list is on this same page, so a filter change should not
              // throw the reader back to the top of it.
              scroll={false}
              aria-current={isActive ? 'true' : undefined}
              className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors md:flex-auto md:flex-row md:gap-1.5 md:text-sm ${
                isActive
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {option.level && <PracticeLevelDots level={option.level} />}
              <span className="max-w-full truncate md:overflow-visible">{option.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {visible.map((item) => (
          <Fragment key={item.key}>{item.card}</Fragment>
        ))}
      </div>
    </div>
  );
}

function FilterFromQuery(props: Props) {
  const level = useSearchParams().get(PRACTICE_LEVEL_PARAM);

  // An unknown level shows everything rather than 404ing or emptying the
  // grid, so an old shared link still lands on a usable practice list. This
  // is not hypothetical: `?level=introduction` and `?level=expert` were
  // real values until those two bands were folded into Beginner and
  // Advanced.
  const selected = level !== null && isPracticeLevel(level) ? level : undefined;

  return <FilteredList {...props} selected={selected} />;
}

/**
 * Difficulty filter over the practice list.
 *
 * The selection lives in the URL rather than in component state so a filtered
 * list can be linked to and shared.
 *
 * Reading it with `useSearchParams` rather than the page's `searchParams`
 * prop is what keeps `/practice` a static route — reading them on the server
 * would make every visit dynamic for a filter that only decides which of the
 * already-rendered cards to show. The cards themselves are built on the
 * server and passed in as nodes, and the `Suspense` fallback is the whole
 * unfiltered list, so the prerendered HTML of this page — the one a search
 * engine indexes — carries every practice module rather than a skeleton.
 */
export function PracticeLevelFilter(props: Props) {
  return (
    <Suspense fallback={<FilteredList {...props} selected={undefined} />}>
      <FilterFromQuery {...props} />
    </Suspense>
  );
}
