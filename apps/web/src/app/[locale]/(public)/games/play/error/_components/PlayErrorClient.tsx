'use client';

import { useState } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { AlgebraicNotation } from '@blindfold-chess/types';
import { FaExclamationTriangle, FaTrash, FaWrench } from 'react-icons/fa';

import { engineConfigFromUrlParams, engineConfigToUrlParams } from '@/lib/engines';
import { LocalStorageGameRepository } from '@/lib/games/local-storage-repository';

import { PageTitle } from '@/app/[locale]/_components/PageTitle';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  locale: Locale;
};

export function PlayErrorClient({ locale }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations('playError');
  const [isProcessing, setIsProcessing] = useState(false);

  // Get error details from URL params
  const invalidMove = searchParams.get('invalidMove') || '';
  const invalidIndex = parseInt(searchParams.get('invalidIndex') || '0');
  const validMovesJson = searchParams.get('validMoves') || '[]';
  const allMovesJson = searchParams.get('allMoves') || '[]';
  const gameId = searchParams.get('gameId') || null;
  const color = searchParams.get('color') || 'white';
  const engineConfig = engineConfigFromUrlParams(searchParams);
  const startingFen = searchParams.get('fen') || undefined;

  let validMoves: AlgebraicNotation[] = [];
  let allMoves: AlgebraicNotation[] = [];
  try {
    validMoves = JSON.parse(validMovesJson);
  } catch {
    // Invalid JSON in URL, use empty array
  }
  try {
    allMoves = JSON.parse(allMovesJson);
  } catch {
    // Invalid JSON in URL, use empty array
  }

  const handleRecover = async () => {
    setIsProcessing(true);

    // Create URL with only valid moves
    const params = new URLSearchParams();
    params.set('color', color);
    for (const [key, value] of Object.entries(engineConfigToUrlParams(engineConfig))) {
      params.set(key, value);
    }

    // Include custom starting FEN if present
    if (startingFen) {
      params.set('fen', startingFen);
    }

    if (gameId) {
      params.set('gameId', gameId);

      // Update localStorage with valid moves only
      const gameRepository = new LocalStorageGameRepository();
      const savedGame = await gameRepository.load(gameId);
      if (savedGame) {
        const updated = await gameRepository.update(gameId, {
          moves: validMoves,
          playerColor: savedGame.playerColor,
          engineConfig: savedGame.engineConfig,
          status: savedGame.status,
          startingFen: savedGame.startingFen,
        });
        if (!updated.ok) {
          // Redirect anyway: the play page re-validates the stored record,
          // and staying on the error page with a stuck spinner helps nobody.
          console.error('Failed to repair saved game:', updated.error);
        }
      }
    } else {
      // No gameId, save the game with valid moves and get new gameId
      if (validMoves.length > 0) {
        const gameRepository = new LocalStorageGameRepository();
        const created = await gameRepository.create({
          moves: validMoves,
          playerColor: color === 'white' || color === 'black' ? color : 'white',
          engineConfig,
          status: 'in_progress',
          startingFen,
        });
        if (created.ok) {
          params.set('gameId', created.value);
        } else {
          // Redirect without an id — the play page starts the recovered
          // position unsaved rather than stranding the user here.
          console.error('Failed to save recovered game:', created.error);
        }
      }
    }

    // Redirect back to play page with corrected data
    router.push(`/${locale}/games/play?${params.toString()}`);
  };

  const handleDelete = async () => {
    setIsProcessing(true);

    if (gameId) {
      // Delete from localStorage
      const gameRepository = new LocalStorageGameRepository();
      await gameRepository.delete(gameId);
    }

    // Redirect to home
    router.push(`/${locale}`);
  };

  return (
    <div className="max-w-none mx-auto">
      <PageTitle>{t('title')}</PageTitle>

      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 mt-6">
        <div className="flex items-start gap-4">
          <FaExclamationTriangle className="text-destructive text-2xl mt-1 flex-shrink-0" />
          <div className="flex-1">
            <h2 className="text-xl font-semibold mb-3">{t('corruptedGame')}</h2>
            <p className="text-foreground/80 mb-4">{t('description')}</p>

            {/* Error Details */}
            <div className="bg-background/50 rounded p-4 space-y-3">
              <div>
                <span className="font-medium text-sm text-muted-foreground">
                  {t('invalidMove')}:
                </span>
                <div className="font-mono text-lg text-destructive mt-1">
                  {invalidIndex + 1}. {invalidMove}
                </div>
              </div>

              <div>
                <span className="font-medium text-sm text-muted-foreground">
                  {t('validMoves')}:
                </span>
                <div className="font-mono text-sm mt-1">
                  {validMoves.length > 0 ? (
                    <div className="space-x-2">
                      {validMoves.map((move: string, idx: number) => (
                        <span key={idx} className="text-foreground/80">
                          {idx % 2 === 0 && `${Math.floor(idx / 2) + 1}.`} {move}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">{t('noValidMoves')}</span>
                  )}
                </div>
              </div>

              <div>
                <span className="font-medium text-sm text-muted-foreground">
                  {t('discardedMoves')}:
                </span>
                <div className="font-mono text-sm mt-1">
                  {allMoves.slice(invalidIndex).map((move: string, idx: number) => (
                    <span
                      key={idx}
                      className={idx === 0 ? 'text-destructive font-bold' : 'text-muted-foreground'}
                    >
                      {idx > 0 && ', '}
                      {move}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recovery Options */}
      <div className="mt-8 space-y-4">
        <h3 className="text-lg font-semibold mb-4">{t('recoveryOptions')}</h3>

        {/* Recover Option */}
        <button
          onClick={handleRecover}
          disabled={isProcessing}
          className="w-full p-6 border border-border rounded-lg hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-left group"
        >
          <div className="flex items-start gap-4">
            <FaWrench className="text-primary text-xl mt-1 group-hover:scale-110 transition-transform" />
            <div className="flex-1">
              <h4 className="font-semibold mb-1">{t('recoverGame')}</h4>
              <p className="text-sm text-muted-foreground">
                {t('recoverDescription', { count: validMoves.length })}
              </p>
            </div>
          </div>
        </button>

        {/* Delete Option */}
        <button
          onClick={handleDelete}
          disabled={isProcessing}
          className="w-full p-6 border border-destructive/20 rounded-lg hover:bg-destructive/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-left group"
        >
          <div className="flex items-start gap-4">
            <FaTrash className="text-destructive text-xl mt-1 group-hover:scale-110 transition-transform" />
            <div className="flex-1">
              <h4 className="font-semibold mb-1">{t('deleteGame')}</h4>
              <p className="text-sm text-muted-foreground">{t('deleteDescription')}</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
