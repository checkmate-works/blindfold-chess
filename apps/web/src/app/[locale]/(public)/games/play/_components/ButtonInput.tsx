'use client';

import { ChessPiece } from '@/app/_components/chess/ChessPiece';
import type { CastlingToken, NotationChar } from '@blindfold-chess/features/ai-game/notation-input';
import type { AlgebraicNotation, PieceType } from '@blindfold-chess/types';
import { FaBackspace, FaTrash } from 'react-icons/fa';

import { CoordinateInput } from '@/app/[locale]/_components/CoordinateInput';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { useButtonInputLogic } from '../_hooks/use-button-input-logic';

type Props = {
  fen: string;
  onSubmit: (move: AlgebraicNotation) => void;
  disabled?: boolean;
  playerColor?: 'w' | 'b';
};

const PIECE_BUTTONS: Array<{ char: NotationChar; type: PieceType }> = [
  { char: 'K', type: 'k' },
  { char: 'Q', type: 'q' },
  { char: 'R', type: 'r' },
  { char: 'B', type: 'b' },
  { char: 'N', type: 'n' },
];

const ANNOTATION_CHARS: NotationChar[] = ['+', '=', '#'];

const CELL_BUTTON_CLASS =
  'w-9 h-9 flex items-center justify-center rounded-md font-bold text-lg transition-colors border bg-background hover:bg-muted border-border';

const CASTLING_BUTTON_CLASS =
  'px-3 h-9 rounded-md font-bold text-xs transition-colors border bg-background hover:bg-muted border-border';

const UTILITY_BUTTON_CLASS =
  'w-14 h-14 bg-background hover:bg-muted border border-border rounded-lg text-foreground flex items-center justify-center';

export function ButtonInput({ fen, onSubmit, disabled = false, playerColor = 'w' }: Props) {
  const { preferences } = useGamePreferences();
  const { buttonInputPieceLabel } = preferences;

  const { input, canSubmit, appendChar, appendCastling, backspace, clear, submit } =
    useButtonInputLogic({ fen, onSubmit });

  return (
    <div className="flex flex-col gap-3 p-4 bg-card rounded-lg">
      {/* Row 1: Pieces + capture */}
      <div className="flex gap-2 justify-center">
        {PIECE_BUTTONS.map(({ char, type }) => (
          <button
            key={char}
            type="button"
            onClick={() => appendChar(char)}
            aria-label={char}
            className={CELL_BUTTON_CLASS}
          >
            {buttonInputPieceLabel === 'icon' ? (
              <ChessPiece type={type} color={playerColor} size={24} />
            ) : (
              char
            )}
          </button>
        ))}
        <button
          type="button"
          onClick={() => appendChar('x')}
          aria-label="capture"
          className={CELL_BUTTON_CLASS}
        >
          ×
        </button>
      </div>

      {/* Row 2: Files */}
      <CoordinateInput
        showRanks={false}
        onFileToggle={(file) => appendChar(file as NotationChar)}
      />

      {/* Row 3: Ranks */}
      <CoordinateInput
        showFiles={false}
        onRankToggle={(rank) => appendChar(rank as NotationChar)}
      />

      {/* Row 4: Annotations + Castling */}
      <div className="flex gap-6 items-center justify-center">
        <div className="flex gap-2">
          {ANNOTATION_CHARS.map((char) => (
            <button
              key={char}
              type="button"
              onClick={() => appendChar(char)}
              aria-label={char}
              className={CELL_BUTTON_CLASS}
            >
              {char}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {(['O-O', 'O-O-O'] as CastlingToken[]).map((move) => (
            <button
              key={move}
              type="button"
              onClick={() => appendCastling(move)}
              className={CASTLING_BUTTON_CLASS}
            >
              {move}
            </button>
          ))}
        </div>
      </div>

      {/* Row 5: Preview + Backspace + Clear + Submit */}
      <div className="flex gap-2 mt-2 items-center">
        <div className="flex-1">
          <div className="w-full px-4 py-3 border rounded-lg bg-background font-mono text-lg h-14 flex items-center border-border">
            <span className="font-bold text-foreground">{input}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={backspace}
          aria-label="Backspace"
          title="Backspace"
          className={UTILITY_BUTTON_CLASS}
        >
          <FaBackspace className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={clear}
          aria-label="Clear"
          title="Clear"
          className={UTILITY_BUTTON_CLASS}
        >
          <FaTrash className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={submit}
          disabled={disabled || !canSubmit}
          className="w-14 h-14 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:shadow-none disabled:text-muted-foreground disabled:cursor-not-allowed text-primary-foreground font-medium rounded-lg transition-all duration-150 flex items-center justify-center text-xl border border-border"
          title="Submit"
        >
          ♟️
        </button>
      </div>
    </div>
  );
}
