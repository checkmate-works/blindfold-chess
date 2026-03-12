'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import { ChessPiece } from '@/app/_components/chess/ChessPiece';
import type { PracticeMode } from '@blindfold-chess/features/common';
import { FaPlay } from 'react-icons/fa';

import { PracticePanel } from '@/app/[locale]/(public)/practice/_components/PracticePanel';
import { ProblemCountSlider } from '@/app/[locale]/(public)/practice/_components/ProblemCountSlider';
import { SegmentedControl } from '@/app/[locale]/(public)/practice/_components/SegmentedControl';
import { BetaNotice, SectionTitle } from '@/app/[locale]/_components';
import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import type { Locale } from '@/app/[locale]/_lib/types';

import { PIECES } from '../_lib/utils';
import { STORAGE_KEY } from './RoutePlanner';
import {
  ROUTE_PLANNER_TUTORIAL_SKIPPED_KEY,
  RoutePlannerTutorialSkipLink,
} from './RoutePlannerTutorialSkipLink';

type Props = {
  locale: Locale;
  problemCount: number;
  selectedPieces: Record<string, boolean>;
  mode: PracticeMode;
  onProblemCountChange: (count: number) => void;
  onSelectedPiecesChange: (pieces: Record<string, boolean>) => void;
  onModeChange: (mode: PracticeMode) => void;
  onShowTutorial?: () => void;
};

export function RoutePlannerSettings({
  locale,
  problemCount,
  selectedPieces,
  mode,
  onProblemCountChange,
  onSelectedPiecesChange,
  onModeChange,
  onShowTutorial,
}: Props) {
  const t = useTranslations('practice.routePlanner');
  const tp = useTranslations('practice');
  const tSettings = useTranslations('practice.settings');
  const tLegalMoves = useTranslations('practice.legalMoves');
  const router = useRouter();

  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const modeOptions: { value: PracticeMode; label: string }[] = [
    { value: 'timed', label: tp('modeTimed') },
    { value: 'training', label: tp('modeTraining') },
  ];

  const handleResetConfirm = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ROUTE_PLANNER_TUTORIAL_SKIPPED_KEY);
    setIsResetConfirmOpen(false);

    if (onShowTutorial) {
      onShowTutorial();
    }
  };

  const handlePieceToggle = (piece: string) => {
    const next = { ...selectedPieces, [piece]: !selectedPieces[piece] };
    // Prevent deselecting all
    if (!Object.values(next).some((v) => v)) return;
    onSelectedPiecesChange(next);
  };

  const handleStart = () => {
    const piecesStr = PIECES.filter((p) => selectedPieces[p]).join('');
    if (mode === 'training') {
      router.push(
        `/${locale}/practice/route-planner/training?pieces=${piecesStr}#route-planner-session`
      );
    } else {
      router.push(
        `/${locale}/practice/route-planner/challenge?count=${problemCount}&pieces=${piecesStr}#route-planner-session`
      );
    }
  };

  return (
    <div>
      <PracticePanel className="p-6">
        <SectionTitle className="mb-4">{tSettings('title')}</SectionTitle>

        <div className="mb-6">
          <SegmentedControl options={modeOptions} value={mode} onChange={onModeChange} />
        </div>

        <BetaNotice className="mb-6">
          <p>{t('betaNotice')}</p>
        </BetaNotice>

        <div className="mb-6 text-muted-foreground">
          <p>{t('description')}</p>
        </div>

        {mode === 'timed' && (
          <div className="mb-6">
            <ProblemCountSlider
              count={problemCount}
              onCountChange={onProblemCountChange}
              labels={{
                count: tSettings('problemCount'),
                unit: tSettings('problems'),
              }}
            />
          </div>
        )}

        {mode === 'training' && (
          <div className="mb-6">
            <p className="text-sm text-muted-foreground">{tp('trainingDescription')}</p>
          </div>
        )}

        {/* Piece Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-foreground mb-3 text-center">
            {tLegalMoves('pieceSelection')}
          </label>
          <div className="flex justify-center gap-2">
            {PIECES.map((piece) => (
              <button
                key={piece}
                onClick={() => handlePieceToggle(piece)}
                className={`w-12 h-12 flex items-center justify-center rounded-md font-bold text-lg transition-colors border ${
                  selectedPieces[piece]
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background hover:bg-muted border-border'
                }`}
                aria-label={tLegalMoves(`pieces.${piece}`)}
                title={tLegalMoves(`pieces.${piece}`)}
              >
                <ChessPiece type={piece} color="w" size={28} />
              </button>
            ))}
          </div>
          <div className="mt-2 text-xs text-muted-foreground text-center animate-in fade-in duration-300">
            {tLegalMoves('selectedCount', {
              count: Object.values(selectedPieces).filter(Boolean).length,
            })}
          </div>
        </div>

        <Button
          onClick={handleStart}
          variant="primary"
          size="lg"
          icon={<FaPlay />}
          className="w-full"
        >
          {mode === 'training' ? tp('startTraining') : tSettings('start')}
        </Button>

        {onShowTutorial && <RoutePlannerTutorialSkipLink onStartTutorial={onShowTutorial} />}
      </PracticePanel>

      <div className="mt-8 flex justify-end">
        <Button variant="destructive" onClick={() => setIsResetConfirmOpen(true)}>
          {t('resetSettings')}
        </Button>
      </div>

      <ConfirmationModal
        isOpen={isResetConfirmOpen}
        title={t('resetSettingsConfirm.title')}
        message={t('resetSettingsConfirm.message')}
        confirmText={t('resetSettings')}
        cancelText={tSettings('cancel')}
        confirmVariant="danger"
        onConfirm={handleResetConfirm}
        onCancel={() => setIsResetConfirmOpen(false)}
      />
    </div>
  );
}
