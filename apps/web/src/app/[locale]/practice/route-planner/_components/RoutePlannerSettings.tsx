'use client';

import { useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import { ChessPiece } from '@/app/_components/chess/ChessPiece';
import type { PieceSymbol } from 'chess.js';
import { FaPlay } from 'react-icons/fa';

import { SectionTitle } from '@/app/[locale]/_components';
import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import type { Locale } from '@/app/[locale]/_lib/types';
import { ProblemCountSlider } from '@/app/[locale]/practice/_components/ProblemCountSlider';

import { PIECES } from '../_lib/utils';
import {
  ROUTE_PLANNER_TUTORIAL_SKIPPED_KEY,
  RoutePlannerTutorialSkipLink,
} from './RoutePlannerTutorialSkipLink';

type Props = {
  locale: Locale;
  onShowTutorial?: () => void;
};

const STORAGE_KEY = 'routePlannerSettings';
const DEFAULT_PROBLEM_COUNT = 5;

export function RoutePlannerSettings({ locale, onShowTutorial }: Props) {
  const t = useTranslations('practice.routePlanner');
  const tSettings = useTranslations('practice.settings');
  const tLegalMoves = useTranslations('practice.legalMoves'); // For piece names
  const router = useRouter();

  const [problemCount, setProblemCount] = useState(DEFAULT_PROBLEM_COUNT);
  const [selectedPieces, setSelectedPieces] = useState<Record<string, boolean>>({
    N: true,
    B: true,
    R: true,
    Q: true,
  });
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const handleResetConfirm = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ROUTE_PLANNER_TUTORIAL_SKIPPED_KEY);
    setIsResetConfirmOpen(false);

    // Refresh page to trigger tutorial check in RoutePlannerPageContent
    if (onShowTutorial) {
      onShowTutorial();
    }
    // Force reload just in case onShowTutorial isn't enough or state needs clearing
    // but onShowTutorial updates parent state to show tutorial, so that should be enough.
  };

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        if (settings.problemCount) {
          setProblemCount(settings.problemCount);
        }
        if (settings.selectedPieces) {
          setSelectedPieces(settings.selectedPieces);
        }
      } catch {
        // ignore
      }
    }
    setHasLoaded(true);
  }, []);

  useEffect(() => {
    if (!hasLoaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ problemCount, selectedPieces }));
  }, [problemCount, selectedPieces, hasLoaded]);

  const handlePieceToggle = (piece: string) => {
    setSelectedPieces((prev) => {
      const next = { ...prev, [piece]: !prev[piece] };
      // Prevent deselecting all
      if (!Object.values(next).some((v) => v)) return prev;
      return next;
    });
  };

  const handleStart = () => {
    const piecesStr = PIECES.filter((p) => selectedPieces[p]).join('');
    router.push(
      `/${locale}/practice/route-planner/session?count=${problemCount}&pieces=${piecesStr}#route-planner-session`
    );
  };

  if (!hasLoaded) return null;

  return (
    <div>
      <div className="bg-card rounded-xl shadow-sm border border-border p-6">
        <SectionTitle className="mb-4">{tSettings('title')}</SectionTitle>

        <div className="mb-6 text-muted-foreground">
          <p>{t('description')}</p>
        </div>

        <div className="mb-6">
          <ProblemCountSlider
            count={problemCount}
            onCountChange={setProblemCount}
            labels={{
              count: tSettings('problemCount'),
              unit: tSettings('problems'),
            }}
          />
        </div>

        {/* Piece Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-foreground mb-3 text-center">
            {tLegalMoves('pieceSelection')}
          </label>
          <div className="flex justify-center gap-2">
            {PIECES.map((piece) => {
              // Map route planner piece type to display map key if needed
              // RoutePlanner: N, B, R, Q
              // displayMap: knight, bishop, rook, queen
              const mapKey = {
                N: 'knight',
                B: 'bishop',
                R: 'rook',
                Q: 'queen',
              }[piece] as string;

              return (
                <button
                  key={piece}
                  onClick={() => handlePieceToggle(piece)}
                  className={`w-12 h-12 flex items-center justify-center rounded-md font-bold text-lg transition-colors border ${
                    selectedPieces[piece]
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-muted border-border'
                  }`}
                  aria-label={tLegalMoves(`pieces.${mapKey}`)}
                  title={tLegalMoves(`pieces.${mapKey}`)}
                >
                  <ChessPiece type={piece.toLowerCase() as PieceSymbol} color="w" size={28} />
                </button>
              );
            })}
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
          {tSettings('start')}
        </Button>

        {onShowTutorial && <RoutePlannerTutorialSkipLink onStartTutorial={onShowTutorial} />}
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
