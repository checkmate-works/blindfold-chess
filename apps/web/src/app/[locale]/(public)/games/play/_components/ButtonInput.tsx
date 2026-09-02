'use client';

import { useRef } from 'react';

import { useTranslations } from 'next-intl';

import { ChessPiece } from '@/app/_components/chess/ChessPiece';
import type { CastlingToken, NotationChar } from '@blindfold-chess/features/ai-game/notation-input';
import type { AlgebraicNotation, PieceColor, PieceType } from '@blindfold-chess/types';
import { FaBackspace, FaCheck, FaTrash } from 'react-icons/fa';

import { CoordinateInput } from '@/app/[locale]/_components/CoordinateInput';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { useButtonInputLogic } from '../_hooks/use-button-input-logic';
import { useNotationKeyboardInput } from '../_hooks/use-notation-keyboard-input';

type Props = {
  fen: string;
  onSubmit: (move: AlgebraicNotation) => void;
  disabled?: boolean;
  playerColor?: PieceColor;
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

// Buttons are 44px (`w-11`/`h-11`) below the `sm` breakpoint to meet the
// mobile touch-target guideline, then drop to the desktop-tuned 36px.
const CELL_BUTTON_CLASS =
  'w-11 h-11 sm:w-9 sm:h-9 flex items-center justify-center rounded-md font-bold text-lg transition-colors border bg-background hover:bg-muted border-border disabled:opacity-50 disabled:cursor-not-allowed';

const CASTLING_BUTTON_CLASS =
  'px-3 h-11 sm:h-9 rounded-md font-bold text-xs transition-colors border bg-background hover:bg-muted border-border disabled:opacity-50 disabled:cursor-not-allowed';

const UTILITY_BUTTON_CLASS =
  'w-14 h-14 bg-background hover:bg-muted border border-border rounded-lg text-foreground flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed';

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

  // Physical-keyboard entry drives the exact same handlers as the buttons, so
  // error-clearing and state stay in lockstep with clicks.
  const containerRef = useRef<HTMLDivElement>(null);
  useNotationKeyboardInput({
    onChar: handleAppendChar,
    onBackspace: handleBackspace,
    onSubmit: () => {
      if (canSubmit) submit();
    },
    containerRef,
    enabled: !disabled,
  });

  return (
    // translate="no": piece letters, coordinates and SAN move text are notation,
    // not prose. Browser auto-translation wraps these text nodes in <font>
    // elements, desyncing React's DOM refs and crashing commit-phase deletion
    // with "Failed to execute 'removeChild'". See facebook/react#11538.
    // data-tour-id anchors the play help tour's keyboard-input step; since the
    // tour resolves targets from the DOM at click time, the step is
    // automatically skipped whenever another input mode is active.
    <div
      ref={containerRef}
      translate="no"
      data-tour-id="play-button-input"
      className="flex flex-col gap-3 p-2 sm:p-4 bg-card rounded-lg"
    >
      {/* Row 1: Pieces + capture. Six 44px buttons overflow a ~320px viewport,
          so below `sm` they flex-shrink evenly (44px stays the cap). */}
      <div className="flex gap-2 justify-center">
        {PIECE_BUTTONS.map(({ char, type, labelKey }) => (
          <button
            key={char}
            type="button"
            onClick={() => handleAppendChar(char)}
            disabled={disabled}
            aria-label={t(`piece.${labelKey}`)}
            className={`${CELL_BUTTON_CLASS} flex-1 min-w-0 max-w-11 sm:flex-none sm:max-w-none`}
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
          disabled={disabled}
          aria-label={t('symbol.capture')}
          className={`${CELL_BUTTON_CLASS} flex-1 min-w-0 max-w-11 sm:flex-none sm:max-w-none`}
        >
          ×
        </button>
      </div>

      {/* Row 2: Files */}
      <CoordinateInput
        showRanks={false}
        onFileToggle={(file) => handleAppendChar(file as NotationChar)}
        disabledFile={() => disabled}
      />

      {/* Row 3: Ranks */}
      <CoordinateInput
        showFiles={false}
        onRankToggle={(rank) => handleAppendChar(rank as NotationChar)}
        disabledRank={() => disabled}
      />

      {/* Row 4: Annotations + Castling. The inter-group gap tightens on
          mobile so the 44px buttons still fit a ~320px viewport. */}
      <div className="flex gap-4 sm:gap-6 items-center justify-center">
        <div className="flex gap-2">
          {ANNOTATION_BUTTONS.map(({ char, labelKey }) => (
            <button
              key={char}
              type="button"
              onClick={() => handleAppendChar(char)}
              disabled={disabled}
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
              disabled={disabled}
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
          disabled={disabled}
          aria-label={t('action.backspace')}
          title={t('action.backspace')}
          className={UTILITY_BUTTON_CLASS}
        >
          <FaBackspace className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={handleClear}
          disabled={disabled}
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
          className="w-14 h-14 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:text-muted-foreground disabled:cursor-not-allowed text-primary-foreground font-medium rounded-lg transition-all duration-150 flex items-center justify-center text-xl border border-border"
          aria-label={t('action.submit')}
          title={t('action.submit')}
        >
          <FaCheck className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
