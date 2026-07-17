'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { BoardFrame } from '@/app/_components/chess/BoardFrame';
import { ChessBoard } from '@/app/_components/chess/ChessBoard';
import { FlipBoardButton } from '@/app/_components/chess/FlipBoardButton';
import { FaTrash } from 'react-icons/fa';

import type { RepertoireSide } from '@/lib/repertoires/validation';

import { MoveNavigationControls } from '@/app/[locale]/(public)/games/play/_components/MoveNavigationControls';

import { useRepertoireBoardBuilder } from './use-repertoire-board-builder';

type Props = {
  /** The author's side — orients the board; both sides' moves are playable. */
  side: RepertoireSide;
  /** PGN already in the form when board mode opens (carried over from paste mode). */
  initialPgn?: string;
  /** Receives the serialized PGN-with-variations after every authoring action. */
  onPgnChange: (pgn: string) => void;
};

/**
 * Board-first authoring for a repertoire (型): play moves for both sides on an
 * interactive board; going back and playing a different move creates a
 * variation (a new line), lichess-study style. The move list above the board
 * mirrors the PGN being built — every move is clickable, variations render in
 * parentheses — and the whole tree serializes through `onPgnChange` into the
 * same form state the paste-a-PGN mode fills, so submission is identical.
 *
 * Presentation follows the other position-based UGC editors (chunk / puzzle
 * forms): the standard `BoardFrame` width and a flip control above the board.
 */
export function RepertoireBoardBuilder({ side, initialPgn, onPgnChange }: Props) {
  const t = useTranslations('Repertoires');
  const builder = useRepertoireBoardBuilder({ initialPgn, onPgnChange });

  // Orientation defaults to the author's side and re-follows it when the side
  // radio changes; the flip button then adjusts freely from that base.
  const [flipped, setFlipped] = useState(side === 'black');
  const [prevSide, setPrevSide] = useState(side);
  if (side !== prevSide) {
    setPrevSide(side);
    setFlipped(side === 'black');
  }

  const currentPathKey = builder.path.join('.');

  return (
    <div className="space-y-2">
      <BoardFrame>
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">
            {t(builder.turn === 'w' ? 'boardBuilder.whiteToMove' : 'boardBuilder.blackToMove')}
          </span>
          <FlipBoardButton onClick={() => setFlipped((f) => !f)} title={t('boardBuilder.flip')} />
        </div>

        {/* The move tree as wrapping PGN-style text; the cursor's move is
            highlighted, every move navigates the board to its position. */}
        <div className="mb-2 min-h-9 text-sm leading-7">
          {builder.isEmpty ? (
            <span className="text-muted-foreground">{t('boardBuilder.empty')}</span>
          ) : (
            builder.tokens.map((token, i) =>
              token.type === 'move' ? (
                <button
                  key={`${i}-${token.path.join('.')}`}
                  type="button"
                  onClick={() => builder.jumpTo(token.path)}
                  className={`mx-0.5 rounded px-1 py-0.5 font-mono transition-colors ${
                    token.path.join('.') === currentPathKey
                      ? 'bg-link-primary/10 font-medium text-link-primary'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  {token.label}
                </button>
              ) : (
                <span key={i} className="text-muted-foreground">
                  {token.type === 'open' ? '(' : ')'}
                </span>
              )
            )
          )}
        </div>

        <ChessBoard
          fen={builder.currentFen}
          flipped={flipped}
          playerSide={side}
          lastMove={builder.lastMove}
          onMove={builder.handleMove}
          movablePieces="side-to-move"
          showCoordinates
          boardTheme="lichess"
        />

        <div className="flex items-center justify-between" style={{ aspectRatio: '8 / 1' }}>
          {/* Spacer mirroring the delete button so the nav cluster stays centered. */}
          <div className="w-10" aria-hidden />
          <MoveNavigationControls
            onNavigateToStart={builder.goToStart}
            onNavigatePrevious={builder.goBack}
            onNavigateNext={builder.goForward}
            onNavigateToEnd={builder.goToEnd}
            isPreviousDisabled={builder.isAtStart}
            isNextDisabled={!builder.hasNext}
          />
          <button
            type="button"
            onClick={builder.deleteCurrent}
            disabled={builder.isAtStart}
            title={t('boardBuilder.deleteFromHere')}
            aria-label={t('boardBuilder.deleteFromHere')}
            className="flex h-10 w-10 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-destructive disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
          >
            <FaTrash size={14} />
          </button>
        </div>
      </BoardFrame>

      <p className="text-xs text-muted-foreground">{t('boardBuilder.help')}</p>
    </div>
  );
}
