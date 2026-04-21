'use client';

import { useTranslations } from 'next-intl';

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
  onClearError?: () => void;
};

type PieceLabelKey = 'king' | 'queen' | 'rook' | 'bishop' | 'knight';

const PIECE_BUTTONS: Array<{ char: NotationChar; type: PieceType; labelKey: PieceLabelKey }> = [
  { char: 'K', type: 'k', labelKey: 'king' },
  { char: 'Q', type: 'q', labelKey: 'queen' },
  { char: 'R', type: 'r', labelKey: 'rook' },
  { char: 'B', type: 'b', labelKey: 'bishop' },
  { char: 'N', type: 'n', labelKey: 'knight' },
];

type AnnotationLabelKey = 'check' | 'promotion' | 'checkmate';

const ANNOTATION_BUTTONS: Array<{ char: NotationChar; labelKey: AnnotationLabelKey }> = [
  { char: '+', labelKey: 'check' },
  { char: '=', labelKey: 'promotion' },
  { char: '#', labelKey: 'checkmate' },
];

type CastlingLabelKey = 'kingside' | 'queenside';

const CASTLING_BUTTONS: Array<{ move: CastlingToken; labelKey: CastlingLabelKey }> = [
  { move: 'O-O', labelKey: 'kingside' },
  { move: 'O-O-O', labelKey: 'queenside' },
];

const CELL_BUTTON_CLASS =
  'w-9 h-9 flex items-center justify-center rounded-md font-bold text-lg transition-colors border bg-background hover:bg-muted border-border';

const CASTLING_BUTTON_CLASS =
  'px-3 h-9 rounded-md font-bold text-xs transition-colors border bg-background hover:bg-muted border-border';

const UTILITY_BUTTON_CLASS =
  'w-14 h-14 bg-background hover:bg-muted border border-border rounded-lg text-foreground flex items-center justify-center';

export function ButtonInput({
  fen,
  onSubmit,
  disabled = false,
  playerColor = 'w',
  onClearError,
}: Props) {
  const { preferences } = useGamePreferences();
  const { buttonInputPieceLabel } = preferences;
  const t = useTranslations('buttonInput');

  const { input, canSubmit, appendChar, appendCastling, backspace, clear, submit } =
    useButtonInputLogic({ fen, onSubmit });

  const handleAppendChar = (char: NotationChar) => {
    onClearError?.();
    appendChar(char);
  };

  const handleAppendCastling = (move: CastlingToken) => {
    onClearError?.();
    appendCastling(move);
  };

  const handleBackspace = () => {
    onClearError?.();
    backspace();
  };

  const handleClear = () => {
    onClearError?.();
    clear();
  };

  return (
    <div className="flex flex-col gap-3 p-4 bg-card rounded-lg">
      {/* Row 1: Pieces + capture */}
      <div className="flex gap-2 justify-center">
        {PIECE_BUTTONS.map(({ char, type, labelKey }) => (
          <button
            key={char}
            type="button"
            onClick={() => handleAppendChar(char)}
            aria-label={t(`piece.${labelKey}`)}
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
          onClick={() => handleAppendChar('x')}
          aria-label={t('symbol.capture')}
          className={CELL_BUTTON_CLASS}
        >
          ×
        </button>
      </div>

      {/* Row 2: Files */}
      <CoordinateInput
        showRanks={false}
        onFileToggle={(file) => handleAppendChar(file as NotationChar)}
      />

      {/* Row 3: Ranks */}
      <CoordinateInput
        showFiles={false}
        onRankToggle={(rank) => handleAppendChar(rank as NotationChar)}
      />

      {/* Row 4: Annotations + Castling */}
      <div className="flex gap-6 items-center justify-center">
        <div className="flex gap-2">
          {ANNOTATION_BUTTONS.map(({ char, labelKey }) => (
            <button
              key={char}
              type="button"
              onClick={() => handleAppendChar(char)}
              aria-label={t(`symbol.${labelKey}`)}
              className={CELL_BUTTON_CLASS}
            >
              {char}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {CASTLING_BUTTONS.map(({ move, labelKey }) => (
            <button
              key={move}
              type="button"
              onClick={() => handleAppendCastling(move)}
              aria-label={t(`castling.${labelKey}`)}
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
          <div className="w-full px-4 py-3 border border-border rounded-lg bg-background font-mono text-lg h-14 flex items-center truncate">
            <span className="font-bold text-foreground truncate">{input}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleBackspace}
          aria-label={t('action.backspace')}
          title={t('action.backspace')}
          className={UTILITY_BUTTON_CLASS}
        >
          <FaBackspace className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={handleClear}
          aria-label={t('action.clear')}
          title={t('action.clear')}
          className={UTILITY_BUTTON_CLASS}
        >
          <FaTrash className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={submit}
          disabled={disabled || !canSubmit}
          className="w-14 h-14 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:shadow-none disabled:text-muted-foreground disabled:cursor-not-allowed text-primary-foreground font-medium rounded-lg transition-all duration-150 flex items-center justify-center text-xl border border-border"
          aria-label={t('action.submit')}
          title={t('action.submit')}
        >
          ♟️
        </button>
      </div>
    </div>
  );
}
