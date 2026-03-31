'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';
import Link from 'next/link';

import { Button } from '@/app/_components';
import { ChessPiece } from '@/app/_components/chess/ChessPiece';
import { FaArrowRight, FaPlay } from 'react-icons/fa';

import { ProblemCountSlider } from '@/app/[locale]/(public)/practice/_components/ProblemCountSlider';
import { BetaNotice, SectionTitle } from '@/app/[locale]/_components';
import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import type { Locale } from '@/app/[locale]/_lib/types';

import { PIECES } from '../_lib/utils';
import { ROUTE_PLANNER_TUTORIAL_SKIPPED_KEY } from './RoutePlannerTutorialSkipLink';
import { STORAGE_KEY } from './constants';

type Props = {
  locale: Locale;
  problemCount: number;
  selectedPieces: Record<string, boolean>;
  onProblemCountChange: (count: number) => void;
  onSelectedPiecesChange: (pieces: Record<string, boolean>) => void;
  onShowTutorial?: () => void;
};

export function RoutePlannerSettings({
  locale,
  problemCount,
  selectedPieces,
  onProblemCountChange,
  onSelectedPiecesChange,
  onShowTutorial,
}: Props) {
  const t = useTranslations('practice.routePlanner');
  const tp = useTranslations('practice');
  const tSettings = useTranslations('practice.settings');

  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

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

  const piecesStr = PIECES.filter((p) => selectedPieces[p]).join('');

  return (
    <div>
      <div className="mb-8">
        <BetaNotice className="mb-6">
          <p>{t('betaNotice')}</p>
        </BetaNotice>

        <SectionTitle className="mb-4">{t('howToPlayTitle')}</SectionTitle>
        <div className="mb-2 rounded-xl border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground mb-4">{t('howToPlayDescription')}</p>
          <div className="flex items-center justify-center gap-3 text-foreground">
            <ChessPiece type="n" color="w" size={36} />
            <span className="text-lg font-bold">e2</span>
            <FaArrowRight className="text-muted-foreground" />
            <span className="text-lg font-bold">g3</span>
          </div>
        </div>
        {onShowTutorial && (
          <div className="mb-6 text-center">
            <button
              onClick={onShowTutorial}
              className="text-sm text-muted-foreground hover:text-foreground underline transition-colors"
            >
              {t('tutorial.viewTutorial')}
            </button>
          </div>
        )}

        <SectionTitle className="mb-4">{tSettings('title')}</SectionTitle>

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

        {/* Piece Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-foreground mb-3 text-center">
            {t('pieceSelection')}
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
                aria-label={t(`pieces.${piece}`)}
                title={t(`pieces.${piece}`)}
              >
                <ChessPiece type={piece} color="w" size={28} />
              </button>
            ))}
          </div>
          <div className="mt-2 text-xs text-muted-foreground text-center animate-in fade-in duration-300">
            {t('selectedCount', {
              count: Object.values(selectedPieces).filter(Boolean).length,
            })}
          </div>
        </div>

        <Link
          href={`/${locale}/practice/route-planner/challenge?count=${problemCount}&pieces=${piecesStr}#route-planner-session`}
        >
          <Button asChild variant="primary" size="lg" icon={<FaPlay />} className="w-full">
            {tp('startChallenge')}
          </Button>
        </Link>
        <div className="mt-4 text-center">
          <Link
            href={`/${locale}/practice/route-planner/training?pieces=${piecesStr}#route-planner-session`}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {tp('switchToTraining')}
          </Link>
        </div>
      </div>

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
