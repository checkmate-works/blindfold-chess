'use client';

import { useEffect, useState } from 'react';

import { ChessBoard } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { Side } from '@blindfold-chess/types';

import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

type Props = {
  settings: GamePreferences;
  playerSide?: Side;
};

// Demo position for preview
const DEMO_FEN = 'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';

export function BoardPreview({ settings, playerSide = 'white' }: Props) {
  const t = useTranslations('Preferences');
  const [previewPerspective, setPreviewPerspective] = useState<'white' | 'black'>(playerSide);

  // Reset preview perspective when playerSide changes
  useEffect(() => {
    setPreviewPerspective(playerSide);
  }, [playerSide]);

  return (
    <div>
      <h4 className="text-sm font-medium text-muted-foreground mb-4 text-center">
        {t('game.preview.title')}
      </h4>

      {/* Perspective toggle */}
      <div className="flex justify-center mb-4">
        <div className="inline-flex rounded-md bg-muted p-1">
          <button
            onClick={() => setPreviewPerspective('white')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              previewPerspective === 'white'
                ? 'bg-card text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('game.preview.whiteView')}
          </button>
          <button
            onClick={() => setPreviewPerspective('black')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              previewPerspective === 'black'
                ? 'bg-card text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('game.preview.blackView')}
          </button>
        </div>
      </div>

      <div className="flex justify-center">
        <div className="w-full max-w-[90vw] sm:max-w-[280px] aspect-square">
          <ChessBoard
            fen={DEMO_FEN}
            flipped={previewPerspective === 'black'}
            playerSide={previewPerspective}
            showCoordinates={settings.showCoordinates}
            showOwnPieces={settings.showOwnPieces}
            showOpponentPieces={settings.showOpponentPieces}
            pieceShapeMode={settings.pieceShapeMode}
            pieceColors={settings.pieceColors}
            boardTheme={settings.boardTheme}
            className="w-full h-full"
          />
        </div>
      </div>
    </div>
  );
}
