'use client';

import { type ReactNode, useCallback, useState } from 'react';

import { Button } from '@/app/_components';
import { Link } from '@/i18n/routing';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { PuzzleExamProblem } from '@blindfold-chess/features/dojo-journey';
import type { EarnedRankSlug } from '@blindfold-chess/features/dojo-ranks';
import { FaPlay } from 'react-icons/fa';

import { PositionDetailLayout } from '@/app/[locale]/(public)/practice/(free-play)/_components/PositionDetailLayout';
import { PuzzleSessionClient } from '@/app/[locale]/(public)/practice/(free-play)/puzzle/_components/session/PuzzleSessionClient';
import type { BreadcrumbItem } from '@/app/[locale]/_components/Breadcrumb';
import { Divider } from '@/app/[locale]/_components/Divider';
import { PagePanel } from '@/app/[locale]/_components/PagePanel';
import { PageTitle } from '@/app/[locale]/_components/PageTitle';
import { TEXT_LINK_MUTED_CLASSES } from '@/app/[locale]/_lib/link-classes';
import type { Locale } from '@/app/[locale]/_lib/types';

import { useExamSubmission } from '../_hooks/use-exam-submission';
import { ExamOutcome } from './ExamOutcome';

type Props = {
  rank: EarnedRankSlug;
  problem: PuzzleExamProblem;
  title: string;
  /** Pre-rendered pieces list, as the stored-puzzle session takes it. */
  piecesInfo: ReactNode;
  /** Pre-rendered breadcrumb, as the stored-puzzle session takes it. */
  breadcrumb: ReactNode;
  /** The same trail, as the detail-page layout before the attempt takes it. */
  breadcrumbItems: BreadcrumbItem[];
  locale: Locale;
  /**
   * What the page shows above the start button before the attempt starts —
   * the problem's description section, rendered on the server.
   */
  intro: ReactNode;
  /** Name of the rank a player has to hold before a pass is recorded. */
  prevRankName: string;
};

/**
 * The puzzle problem of a rank's exam: the ordinary puzzle session, except
 * that the solve goes to the server for grading instead of to a result page,
 * and there is no "show answer".
 *
 * The page opens on {@link Props.intro} and a start button, laid out like a
 * stored puzzle's detail page, before the session mounts. The session stays
 * on screen while the answer is sent; the verdict then takes its place, and
 * a retry mounts a fresh session straight away.
 */
export function ExamPuzzleSession({
  rank,
  problem,
  title,
  piecesInfo,
  breadcrumb,
  breadcrumbItems,
  locale,
  prevRankName,
  intro,
}: Props) {
  const t = useTranslations('dojoExam');
  const [started, setStarted] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const { verdict, submit, reset } = useExamSubmission(rank, 'puzzle');

  const handleSolve = useCallback(
    (_solve: unknown, playerMoves: string[]) => submit({ moves: playerMoves }),
    [submit]
  );

  const handleRetry = useCallback(() => {
    reset();
    setAttempt((n) => n + 1);
  }, [reset]);

  if (!started) {
    return (
      <PositionDetailLayout title={title} locale={locale} breadcrumbItems={breadcrumbItems}>
        {intro}
        <div className="space-y-4 pt-2">
          <Button
            onClick={() => setStarted(true)}
            variant="primary"
            size="lg"
            icon={<FaPlay />}
            fullWidth
          >
            {t('start')}
          </Button>
          <div className="text-center">
            <Link href={`/dojo/exams/${rank}`} className={`text-sm ${TEXT_LINK_MUTED_CLASSES}`}>
              {t('backToExam')}
            </Link>
          </div>
        </div>
      </PositionDetailLayout>
    );
  }

  if (verdict.kind === 'idle' || verdict.kind === 'submitting') {
    return (
      <PuzzleSessionClient
        key={attempt}
        solutions={problem.solutions}
        // Not a stored puzzle: with `onSolve` given, the id only names the
        // session and is never used to build a URL or a storage key.
        positionId={`exam-${rank}-puzzle`}
        fen={problem.fen}
        positionTitle={title}
        piecesInfo={piecesInfo}
        breadcrumb={breadcrumb}
        onSolve={handleSolve}
        hideShowAnswer
      />
    );
  }

  return (
    <div className="space-y-8">
      <PageTitle>{title}</PageTitle>
      <PagePanel>
        <ExamOutcome
          rank={rank}
          verdict={verdict}
          prevRankName={prevRankName}
          onRetry={handleRetry}
        />
        <div className="!mt-4 space-y-4">
          <Divider />
          {breadcrumb}
        </div>
      </PagePanel>
    </div>
  );
}
