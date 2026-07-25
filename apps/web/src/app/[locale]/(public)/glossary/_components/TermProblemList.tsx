import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

import { ChessBoard } from '@/app/_components';

import type { TermProblem } from '@/lib/glossary/term-positions';

import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  problems: TermProblem[];
  locale: Locale;
};

const BADGE_CLASS: Record<TermProblem['type'], string> = {
  puzzle: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  memory: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  // `sequence` never reaches here (no detail path), but the map must be total.
  sequence: 'bg-secondary text-muted-foreground',
};

/**
 * The "Problems" tab of a glossary term page: the practice positions tagged
 * with this term (via `position_themes`), each a link to its practice page
 * with a board thumbnail and a puzzle / memory badge. Server component —
 * fetches only the mode-name translations it renders.
 */
export async function TermProblemList({ problems, locale }: Props) {
  const [tPuzzle, tMemory] = await Promise.all([
    getTranslations({ locale, namespace: 'practice.puzzle' }),
    getTranslations({ locale, namespace: 'practice.positionMemory' }),
  ]);

  return (
    <ul className="space-y-3">
      {problems.map((problem) => {
        const isPuzzle = problem.type === 'puzzle';
        const label = isPuzzle ? tPuzzle('title') : tMemory('title');
        return (
          <li key={problem.id}>
            <Link
              href={`/${locale}${problem.detailPath}`}
              className="flex items-center gap-4 rounded-lg border border-border p-3 transition-colors hover:border-primary hover:bg-secondary/30"
            >
              <div className="w-20 shrink-0 sm:w-24">
                <ChessBoard fen={problem.fen} showCoordinates={false} rounded annotations={null} />
              </div>
              <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                <span className="min-w-0 truncate font-medium text-foreground">
                  {problem.title}
                </span>
                <span
                  className={`inline-block shrink-0 rounded px-2 py-0.5 text-xs font-medium ${BADGE_CLASS[problem.type]}`}
                >
                  {label}
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
