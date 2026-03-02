'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { PracticeResultSkeleton } from '@/app/[locale]/(public)/practice/_components/PracticeResultSkeleton';
import { ProgressBar } from '@/app/[locale]/(public)/practice/_components/ProgressBar';
import { QuitConfirmModal } from '@/app/[locale]/(public)/practice/_components/QuitConfirmModal';
import { ScoreCounter } from '@/app/[locale]/(public)/practice/_components/ScoreCounter';
import { SectionTitle } from '@/app/[locale]/_components';
import { useToast } from '@/app/[locale]/_contexts/ToastContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import QuadrantBoard, { QuadrantId } from './QuadrantBoard';

type Props = {
  initialProblemCount: number;
  initialOrientation: 'white' | 'black' | 'random';
  mode?: 'standard' | 'training';
};

export default function QuadrantPlaying({
  initialProblemCount,
  initialOrientation,
  mode = 'standard',
}: Props) {
  const t = useTranslations('practice.quadrantAnchors');
  const tCommon = useTranslations('practice');
  const tQuiz = useTranslations('practice.coordinateQuiz');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const { showToast } = useToast();

  const isTraining = mode === 'training';

  const [currentSquare, setCurrentSquare] = useState<string>('');
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState(0);
  const [round, setRound] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [currentOrientation, setCurrentOrientation] = useState<'white' | 'black'>(
    initialOrientation === 'black' ? 'black' : 'white'
  );
  const hasStarted = useRef(false);

  useEffect(() => {
    if (initialOrientation === 'white') setCurrentOrientation('white');
    else if (initialOrientation === 'black') setCurrentOrientation('black');
  }, [initialOrientation]);

  const [feedbackState, setFeedbackState] = useState<{
    correct?: QuadrantId;
    wrong?: QuadrantId;
  }>({});

  const generateSquare = useCallback(() => {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];
    const file = files[Math.floor(Math.random() * files.length)];
    const rank = ranks[Math.floor(Math.random() * ranks.length)];
    return `${file}${rank}`;
  }, []);

  const getCorrectQuadrant = (square: string): QuadrantId => {
    const file = square[0];
    const rank = parseInt(square[1]);
    const isKingSide = ['e', 'f', 'g', 'h'].includes(file);
    const isUpper = rank >= 5;

    if (isKingSide && isUpper) return 'q1';
    if (!isKingSide && isUpper) return 'q2';
    if (!isKingSide && !isUpper) return 'q3';
    return 'q4';
  };

  const nextProblem = useCallback(() => {
    if (!isTraining && round >= initialProblemCount) {
      setIsFinished(true);
      return;
    }

    setFeedbackState({});
    const newSquare = generateSquare();
    setCurrentSquare(newSquare);

    if (initialOrientation === 'random') {
      const isWhite = Math.random() < 0.5;
      setCurrentOrientation(isWhite ? 'white' : 'black');
    }

    setRound((r) => r + 1);
  }, [generateSquare, round, initialProblemCount, initialOrientation, isTraining]);

  useEffect(() => {
    if (round === 0 && !currentSquare && !hasStarted.current) {
      hasStarted.current = true;
      nextProblem();
    }
  }, [nextProblem, round, currentSquare]);

  useEffect(() => {
    setTimeout(() => {
      const element = document.getElementById('quadrant-session');
      if (element) {
        element.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    }, 100);
  }, []);

  const handleQuadrantClick = (id: QuadrantId) => {
    if (feedbackState.correct) return;

    const correctId = getCorrectQuadrant(currentSquare);
    const isCorrect = id === correctId;

    if (isCorrect) {
      setCorrectAnswers((s) => s + 1);
      setFeedbackState({ correct: correctId });

      setTimeout(() => {
        nextProblem();
      }, 500);
    } else {
      setWrongAnswers((s) => s + 1);
      setFeedbackState({ correct: correctId, wrong: id });

      setTimeout(() => {
        nextProblem();
      }, 1500);
    }
  };

  const handleEndTraining = useCallback(() => {
    showToast(tCommon('trainingEnded'), 'info');
    router.push(`/${locale}/practice/quadrants`);
  }, [showToast, tCommon, router, locale]);

  const handleQuit = () => {
    setShowQuitModal(true);
  };

  const confirmQuit = () => {
    router.push(`/${locale}/practice/quadrants`);
  };

  useEffect(() => {
    if (isFinished) {
      const settings = {
        count: initialProblemCount,
        orientation: initialOrientation,
      };

      const result = {
        score: correctAnswers,
        total: initialProblemCount,
      };

      const params = new URLSearchParams();
      params.set('data', JSON.stringify(result));
      params.set('settings', JSON.stringify(settings));

      router.push(`/${locale}/practice/quadrants/result?${params.toString()}`);
    }
  }, [isFinished, correctAnswers, initialProblemCount, initialOrientation, locale, router]);

  if (isFinished) {
    return <PracticeResultSkeleton />;
  }

  return (
    <div id="quadrant-session" className="min-h-screen max-w-2xl mx-auto space-y-4">
      <div className="bg-card border border-border rounded-lg p-6 space-y-6">
        {!isTraining && initialProblemCount > 1 && (
          <ProgressBar current={round} total={initialProblemCount} />
        )}

        {/* Orientation Indicator */}
        <div className="flex justify-center mb-2">
          <div className="flex items-center gap-2">
            <div
              className={`w-5 h-5 rounded-full border-2 ${
                currentOrientation === 'white'
                  ? 'bg-white border-gray-800 dark:border-gray-600'
                  : 'bg-gray-800 dark:bg-gray-700 border-gray-800 dark:border-gray-600'
              }`}
            />
            <span className="text-sm font-medium text-muted-foreground">
              {currentOrientation === 'white' ? tQuiz('whiteToMove') : tQuiz('blackToMove')}
            </span>
          </div>
        </div>

        <SectionTitle className="mb-4 text-center">
          {t('question', { square: currentSquare })}
        </SectionTitle>

        <div className="min-h-[120px] flex flex-col justify-center items-center">
          <QuadrantBoard
            correctQuadrant={feedbackState.correct}
            wrongQuadrant={feedbackState.wrong}
            onQuadrantClick={handleQuadrantClick}
            disabled={!!feedbackState.correct}
            orientation={currentOrientation}
          />
        </div>
      </div>

      <ScoreCounter correct={correctAnswers} incorrect={wrongAnswers} className="mt-4" />

      <div className="flex flex-col items-center gap-2">
        {isTraining ? (
          <button
            onClick={handleEndTraining}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
          >
            {tCommon('endTraining')}
          </button>
        ) : (
          <button
            onClick={handleQuit}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
          >
            {tCommon('quit')}
          </button>
        )}
      </div>

      {!isTraining && (
        <QuitConfirmModal
          isOpen={showQuitModal}
          onConfirm={confirmQuit}
          onCancel={() => setShowQuitModal(false)}
          labels={{
            title: tCommon('quitConfirmModal.title'),
            message: tCommon('quitConfirmModal.message'),
            confirmButton: tCommon('quitConfirmModal.confirmButton'),
            cancelButton: tCommon('quitConfirmModal.cancelButton'),
          }}
        />
      )}
    </div>
  );
}
