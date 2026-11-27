/**
 * Dojo Exam: Position Memory (道場の課題 ポジション記憶, `/dojo/exams/[rank]/position-memory`)
 *
 * @description
 * Runs the position-memory problem of a rank's exam: the position is shown
 * for the problem's memorize seconds, then recreated on an empty board. The
 * recreation is graded on the server against the problem's accuracy mark,
 * and the verdict is shown on this page. Prerendered and kept out of search
 * results; nothing about the viewer is rendered on the server.
 *
 * @flow
 * 1. Unknown rank, or a rank without this problem → 404.
 * 2. The page opens laid out like a saved problem's detail page
 *    (`practice/position-memory/[id]`): what the rank's problem practises as
 *    its description,
 *    the piece list, the collapsible board, the patterns useful for solving
 *    (constants of the exam, not rows in `chunks`) and a start button.
 *    Like that page it shows the position before the attempt; the memorize
 *    seconds limit the attempt, not the study.
 * 3. Memorize → recreate, as in the single-position practice session (no
 *    pause: the seconds are part of the problem).
 * 4. The recreated FEN goes to `submitExamAnswer`. Signed out, the browser
 *    grades it as practice. The verdict offers a retry and the way back.
 * 5. A pass that completes the exam stashes the granted rank and returns to
 *    the problem list, which celebrates it.
 */
import { PositionDetailLayout } from '@/app/[locale]/(public)/practice/(free-play)/_components/PositionDetailLayout';
import { PositionPeekBoard } from '@/app/[locale]/(public)/practice/(free-play)/_components/PositionPeekBoard';
import { PiecesInfo } from '@/app/[locale]/(public)/practice/_components/PiecesInfo';
import { SectionTitle } from '@/app/[locale]/_components';

import { ExamMemorySession } from '../../_components/ExamMemorySession';
import { ExamPatterns } from '../../_components/ExamPatterns';
import {
  type ExamProblemPageParams,
  examProblemMetadata,
  examProblemStaticParams,
  loadExamProblemPage,
} from '../../_lib/exam-problem-page';

type Props = { params: ExamProblemPageParams };

export function generateStaticParams() {
  return examProblemStaticParams('position_memory');
}

/** Every rank with this problem is prerendered; any other segment is a 404. */
export const dynamicParams = false;

export function generateMetadata({ params }: Props) {
  return examProblemMetadata(params, 'position_memory');
}

export default async function DojoExamPositionMemoryPage({ params }: Props) {
  const { locale, exam, problem, t, rankName, prevRankName, problemName, breadcrumbItems } =
    await loadExamProblemPage(params, 'position_memory');
  // dojoExam.memoryIntro.<EarnedRankSlug>: each rank with this problem
  // (generateStaticParams), which says what the rank's problem practises. The
  // condition itself is on the exam's list and in the session's own timer.
  const intro = t(`dojoExam.memoryIntro.${exam}`, { rankName });

  return (
    <PositionDetailLayout title={problemName} locale={locale} breadcrumbItems={breadcrumbItems}>
      <ExamMemorySession
        rank={exam}
        problem={problem}
        prevRankName={prevRankName}
        intro={
          <>
            <SectionTitle>{t('practice.positionMemory.detail.descriptionSection')}</SectionTitle>
            <p className="text-foreground">{intro}</p>
            <PiecesInfo fen={problem.fen} showSideToMove={false} />
            <PositionPeekBoard fen={problem.fen} />
            <ExamPatterns
              patterns={problem.patterns}
              locale={locale}
              detailNamespace="practice.positionMemory.detail"
            />
          </>
        }
      />
    </PositionDetailLayout>
  );
}
