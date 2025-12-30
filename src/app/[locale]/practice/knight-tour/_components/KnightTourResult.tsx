'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/_components';
import { FaCheckCircle, FaRedo, FaTimesCircle } from 'react-icons/fa';

import { KnightTourBoard } from './KnightTourBoard';

type Props = {
  success: boolean;
  moveCount: number;
  visitedSquares: Map<string, number>;
  lastSquare: string;
  startingSquare: string;
  isClosedTour: boolean;
  onPlayAgain: () => void;
};

export function KnightTourResult({
  success,
  moveCount,
  visitedSquares,
  lastSquare,
  startingSquare,
  isClosedTour,
  onPlayAgain,
}: Props) {
  const t = useTranslations('practice.knightTour');
  const tPractice = useTranslations('practice');

  return (
    <div className="space-y-6">
      {/* Result Header */}
      <div
        className={`bg-card rounded-xl shadow-sm border p-6 text-center ${
          success ? 'border-green-500' : 'border-border'
        }`}
      >
        <div className="flex justify-center mb-4">
          {success ? (
            <FaCheckCircle className="text-6xl text-green-500" />
          ) : (
            <FaTimesCircle className="text-6xl text-muted-foreground" />
          )}
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {success ? t('success') : t('incomplete')}
        </h2>
        <p className="text-muted-foreground">
          {success
            ? isClosedTour
              ? t('closedTourMessage')
              : t('openTourMessage')
            : t('incompleteMessage', { count: moveCount })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card rounded-xl shadow-sm border border-border p-4 text-center">
          <p className="text-sm text-muted-foreground mb-1">{t('squaresVisited')}</p>
          <p className="text-2xl font-bold text-foreground">{moveCount} / 64</p>
        </div>
        <div className="bg-card rounded-xl shadow-sm border border-border p-4 text-center">
          <p className="text-sm text-muted-foreground mb-1">{t('startedFrom')}</p>
          <p className="text-2xl font-bold text-foreground">{startingSquare}</p>
        </div>
      </div>

      {/* Final Board */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">{t('finalBoard')}</h3>
        <KnightTourBoard
          currentSquare={lastSquare}
          visitedSquares={visitedSquares}
          availableMoves={[]}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          onClick={onPlayAgain}
          variant="primary"
          size="lg"
          icon={<FaRedo />}
          className="flex-1"
        >
          {tPractice('tryAgain')}
        </Button>
      </div>
    </div>
  );
}
