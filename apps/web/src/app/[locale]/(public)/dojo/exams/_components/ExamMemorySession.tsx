'use client';

import { type ReactNode, useCallback, useMemo, useState } from 'react';

import { Button } from '@/app/_components';
import { Link } from '@/i18n/routing';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { isBlackToMoveFromFen } from '@blindfold-chess/features/chess-core/fen';
import type { MemoryExamProblem } from '@blindfold-chess/features/dojo-journey';
import type { EarnedRankSlug } from '@blindfold-chess/features/dojo-ranks';
import { FaPlay } from 'react-icons/fa';

import {
  PositionMemorySessionView,
  type SessionCompletePayload,
} from '@/app/[locale]/(public)/practice/(free-play)/position-memory/_components/session/PositionMemorySessionView';
import { TEXT_LINK_MUTED_CLASSES } from '@/app/[locale]/_lib/link-classes';

import { useExamSubmission } from '../_hooks/use-exam-submission';
import { ExamOutcome } from './ExamOutcome';

type Props = {
  rank: EarnedRankSlug;
  problem: MemoryExamProblem;
  /** Name of the rank a player has to hold before a pass is recorded. */
  prevRankName: string;
  /**
   * What the page shows before the attempt starts: the problem's condition,
   * rendered on the server. It never shows the position or lists its pieces,
   * since either would let the player study it past the memorize seconds.
   */
  intro: ReactNode;
};

/**
 * The position-memory problem of a rank's exam: the ordinary single-position
 * session, timed to the problem's memorize seconds, whose recreation is sent
 * to the server for grading.
 *
 * The page opens on {@link Props.intro} and a start button, the way a
 * free-play problem opens on its detail page, so the memorize clock does not
 * start the moment the problem is opened from the exam's list. The verdict
 * replaces the session on the same page; a retry mounts a fresh session
 * straight away, as the condition has already been read.
 */
export function ExamMemorySession({ rank, problem, prevRankName, intro }: Props) {
  const t = useTranslations('dojoExam');
  const [started, setStarted] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const { verdict, submit, fail, reset } = useExamSubmission(rank, 'position_memory');

  const presetPositions = useMemo(
    () => [{ fen: problem.fen, isBlackToMove: isBlackToMoveFromFen(problem.fen) }],
    [problem.fen]
  );

  const handleSessionComplete = useCallback(
    ({ results }: SessionCompletePayload) => {
      const item = results[0];
      // A quit run (`s` = skipped) has no recreation worth grading.
      if (!item || item.s === 1) {
        fail();
        return;
      }
      submit({ fen: item.r });
    },
    [submit, fail]
  );

  const handleRetry = useCallback(() => {
    reset();
    setAttempt((n) => n + 1);
  }, [reset]);

  if (!started) {
    return (
      <div className="space-y-6">
        {intro}
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
    );
  }

  if (verdict.kind !== 'idle') {
    return (
      <ExamOutcome
        rank={rank}
        verdict={verdict}
        prevRankName={prevRankName}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <PositionMemorySessionView
      key={attempt}
      timeLimit={problem.memorizeSeconds}
      shuffle={false}
      presetPositions={presetPositions}
      displayMode="board"
      behavior={{
        // No pause: the memorize seconds are the problem's condition.
        enablePause: false,
        skipBehavesAsQuit: true,
        showSkipButton: false,
        skipProblemResult: true,
      }}
      // Leaving goes back to the problem list instead of through the quit
      // dialog; nothing is recorded for an unfinished attempt either way.
      exitAction={
        <Link href={`/dojo/exams/${rank}`} className={`text-sm ${TEXT_LINK_MUTED_CLASSES}`}>
          {t('backToExam')}
        </Link>
      }
      onSessionComplete={handleSessionComplete}
    />
  );
}
