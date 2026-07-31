'use client';

import { useState } from 'react';

import { ChessBoard } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { Side } from '@blindfold-chess/types';

import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

type Props = {
  settings: GamePreferences;
  playerSide?: Side;
};

// Demo position for preview — the position after 1.e4 e6, so the most recent
// move is Black's e7-e6. We highlight it when the "highlight last move" option
// is on, so the preview reflects that setting.
const DEMO_FEN = 'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
const DEMO_LAST_MOVE = { from: 'e7', to: 'e6' };
// Demo "tapped" square for the Piece destinations preview: the d2 pawn, whose
// legal destinations (d3 / d4) render as move dots when the option is on.
const DEMO_SELECTED_SQUARE = 'd2';

export function BoardPreview({ settings, playerSide = 'white' }: Props) {
  const t = useTranslations('Preferences');
  const [previewPerspective, setPreviewPerspective] = useState<'white' | 'black'>(playerSide);

  // Reset preview perspective when playerSide changes — render-phase
  // adjustment (the standard "reset state on prop change" form) instead of a
  // sync effect, which committed one frame in the stale perspective first.
  const [prevPlayerSide, setPrevPlayerSide] = useState(playerSide);
  if (playerSide !== prevPlayerSide) {
    setPrevPlayerSide(playerSide);
    setPreviewPerspective(playerSide);
  }

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
            lastMove={settings.highlightLastMove ? DEMO_LAST_MOVE : null}
            showPieceDestinations={settings.showPieceDestinations}
            previewSelection={settings.showPieceDestinations ? DEMO_SELECTED_SQUARE : null}
            showCoordinates={settings.showCoordinates}
            showOwnPieces={settings.showOwnPieces}
            showOpponentPieces={settings.showOpponentPieces}
            pieceShapeMode={settings.pieceShapeMode}
            pieceColors={settings.pieceColors}
            pawnHideMode={settings.pawnHideMode}
            boardTheme={settings.boardTheme}
            className="w-full h-full"
          />
        </div>
      </div>
    </div>
  );
}
