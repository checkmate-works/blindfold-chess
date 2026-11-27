/**
 * Dojo Exam: Puzzle (道場の課題 パズル, `/dojo/exams/[rank]/puzzle`)
 *
 * @description
 * Runs the puzzle problem of a rank's exam in the ordinary puzzle session.
 * The player's moves are graded on the server once the line is complete,
 * and the verdict is shown on this page instead of the stored puzzles'
 * result page; there is no "show answer". Prerendered and kept out of search
 * results; nothing about the viewer is rendered on the server.
 *
 * @flow
 * 1. Unknown rank, or a rank without this problem → 404.
 * 2. The page opens laid out like a stored puzzle's detail page
 *    (`practice/puzzle/[id]`): what the rank's problem practises as its
 *    description, the piece list, the collapsible board, the patterns useful
 *    for solving (constants of the exam, not rows in `chunks`) and a start
 *    button.
 * 3. Solve move by move, the opponent's replies auto-played, as in a stored
 *    puzzle.
 * 4. On the solving move the player's moves go to `submitExamAnswer`. Signed
 *    out, the browser grades them as practice. The verdict offers a retry
 *    and the way back.
 * 5. A pass that completes the exam stashes the granted rank and returns to
 *    the problem list, which celebrates it.
 */
import { examPuzzleMoveCount } from '@blindfold-chess/features/dojo-journey';

import { PositionPeekBoard } from '@/app/[locale]/(public)/practice/(free-play)/_components/PositionPeekBoard';
import { PiecesInfo } from '@/app/[locale]/(public)/practice/_components/PiecesInfo';
import { SectionTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';

import { ExamPatterns } from '../../_components/ExamPatterns';
import { ExamPuzzleSession } from '../../_components/ExamPuzzleSession';
import {
  type ExamProblemPageParams,
  examProblemMetadata,
  examProblemStaticParams,
  loadExamProblemPage,
} from '../../_lib/exam-problem-page';

type Props = { params: ExamProblemPageParams };

export function generateStaticParams() {
  return examProblemStaticParams('puzzle');
}

/** Every rank with this problem is prerendered; any other segment is a 404. */
export const dynamicParams = false;

export function generateMetadata({ params }: Props) {
  return examProblemMetadata(params, 'puzzle');
}

export default async function DojoExamPuzzlePage({ params }: Props) {
  const { locale, exam, problem, t, rankName, prevRankName, problemName, breadcrumbItems } =
    await loadExamProblemPage(params, 'puzzle');

  const breadcrumb = <Breadcrumb items={breadcrumbItems} locale={locale} density="compact" />;

  return (
    <ExamPuzzleSession
      rank={exam}
      problem={problem}
      title={problemName}
      piecesInfo={<PiecesInfo fen={problem.fen} />}
      breadcrumb={breadcrumb}
      breadcrumbItems={breadcrumbItems}
      locale={locale}
      prevRankName={prevRankName}
      intro={
        <>
          <SectionTitle>{t('practice.puzzle.detail.descriptionSection')}</SectionTitle>
          {/* dojoExam.puzzleIntro.<EarnedRankSlug>: each rank with this
              problem (generateStaticParams), which says what it practises.
              The length of the mate comes from the problem itself. */}
          <p className="text-foreground">
            {t(`dojoExam.puzzleIntro.${exam}`, { rankName, moves: examPuzzleMoveCount(problem) })}
          </p>
          <PiecesInfo fen={problem.fen} />
          <PositionPeekBoard fen={problem.fen} />
          <ExamPatterns
            patterns={problem.patterns}
            locale={locale}
            detailNamespace="practice.puzzle.detail"
          />
        </>
      }
    />
  );
}
