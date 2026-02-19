'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';
import { PracticeResultSkeleton } from '@/app/[locale]/practice/_components/PracticeResultSkeleton';
import { ProgressBar } from '@/app/[locale]/practice/_components/ProgressBar';
import { QuitConfirmModal } from '@/app/[locale]/practice/_components/QuitConfirmModal';
import { ScoreCounter } from '@/app/[locale]/practice/_components/ScoreCounter';

import QuadrantBoard, { QuadrantId } from './QuadrantBoard';

type Props = {
  initialProblemCount: number;
  initialOrientation: 'white' | 'black' | 'random';
};

export default function QuadrantPlaying({ initialProblemCount, initialOrientation }: Props) {
  const t = useTranslations('practice.quadrantAnchors');
  const tCommon = useTranslations('practice');
  const tQuiz = useTranslations('practice.coordinateQuiz'); // Reusing translations for turn view
  const locale = useLocale() as Locale;
  const router = useRouter();

  const [currentSquare, setCurrentSquare] = useState<string>('');
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState(0);
  const [round, setRound] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [showQuitModal, setShowQuitModal] = useState(false);
  // Initialize orientation from prop (default to white for random, nextProblem will randomize it)
  const [currentOrientation, setCurrentOrientation] = useState<'white' | 'black'>(
    initialOrientation === 'black' ? 'black' : 'white'
  );
  const hasStarted = useRef(false);

  // Sync state if prop changes (e.g. component reuse)
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

    if (isKingSide && isUpper) return 'q1'; // Top-Right (White perspective)
    if (!isKingSide && isUpper) return 'q2'; // Top-Left (White perspective)
    if (!isKingSide && !isUpper) return 'q3'; // Bottom-Left (White perspective)
    return 'q4'; // Bottom-Right (White perspective)
  };

  const nextProblem = useCallback(() => {
    // Check if game should end
    if (round >= initialProblemCount) {
      setIsFinished(true);
      return;
    }

    setFeedbackState({});
    const newSquare = generateSquare();
    setCurrentSquare(newSquare);

    // Handle orientation update for random mode
    if (initialOrientation === 'random') {
      const isWhite = Math.random() < 0.5;
      setCurrentOrientation(isWhite ? 'white' : 'black');
    }

    setRound((r) => r + 1);
  }, [generateSquare, round, initialProblemCount, initialOrientation]);

  useEffect(() => {
    // Initial start
    if (round === 0 && !currentSquare && !hasStarted.current) {
      hasStarted.current = true;
      nextProblem();
    }
  }, [nextProblem, round, currentSquare]);

  // Scroll to session element after mount
  useEffect(() => {
    // Tiny delay to ensure DOM is ready
    setTimeout(() => {
      const element = document.getElementById('quadrant-session');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }, []);

  const handleQuadrantClick = (id: QuadrantId) => {
    if (feedbackState.correct) return; // Already answered

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

  const handleQuit = () => {
    setShowQuitModal(true);
  };

  const confirmQuit = () => {
    router.push(`/${locale}/practice/quadrants`);
  };

  // Redirect to result page when finished
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
    <div id="quadrant-session" className="max-w-2xl mx-auto space-y-4">
      <div className="bg-card border border-border rounded-lg p-6 space-y-6">
        {initialProblemCount > 1 && <ProgressBar current={round} total={initialProblemCount} />}

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
            disabled={!!feedbackState.correct} // Disable input during feedback
            orientation={currentOrientation}
          />
        </div>
      </div>

      <ScoreCounter correct={correctAnswers} incorrect={wrongAnswers} className="mt-4" />

      <div className="flex flex-col items-center gap-2">
        <button
          onClick={handleQuit}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
        >
          {tCommon('quit')}
        </button>
      </div>

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
    </div>
  );
}
