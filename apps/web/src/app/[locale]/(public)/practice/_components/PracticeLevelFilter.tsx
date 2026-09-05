'use client';

import { Fragment, type ReactNode, Suspense } from 'react';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

/** The difficulty bands the list can be narrowed to. */
export const PRACTICE_LEVELS = [
  'beginner',
  'intermediate',
  'advanced',
  'expert',
  'introduction',
] as const;

export type PracticeLevel = (typeof PRACTICE_LEVELS)[number];

/** Query key carrying the selected level (`/practice?level=beginner`). */
export const PRACTICE_LEVEL_PARAM = 'level';

function isPracticeLevel(value: string): value is PracticeLevel {
  return (PRACTICE_LEVELS as readonly string[]).includes(value);
}

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

      {/* One row, always. Six options do not fit a narrow phone in any
          locale — エキスパート alone is six characters, and the en/es/pt-BR
          labels (Intermediate … Introduction) are longer still — and wrapping
          them turned the filter into a two-line block sitting above every
          card. Scrolling keeps it the single strip it reads as, the same
          answer the preferences tabs reach for. */}
      <div
        role="group"
        aria-label={filterLabel}
        className="flex gap-1 overflow-x-auto rounded-lg bg-secondary p-1"
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
              className={`shrink-0 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${
                isActive ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {option.label}
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
  // grid: if the bands are ever renamed, an old shared link should still
  // land on a usable practice list.
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
