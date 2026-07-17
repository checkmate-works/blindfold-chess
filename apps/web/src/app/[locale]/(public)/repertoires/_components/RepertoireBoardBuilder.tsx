'use client';

import { useTranslations } from 'next-intl';

import { ChessBoard } from '@/app/_components/chess/ChessBoard';
import { FaTrash } from 'react-icons/fa';

import type { RepertoireSide } from '@/lib/repertoires/validation';

import { MoveNavigationControls } from '@/app/[locale]/(public)/games/play/_components/MoveNavigationControls';
import { INLINE_BOARD_CARD_CHROME } from '@/app/[locale]/(public)/games/play/_lib/skeleton-layout-classes';

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
 */
export function RepertoireBoardBuilder({ side, initialPgn, onPgnChange }: Props) {
  const t = useTranslations('Repertoires');
  const builder = useRepertoireBoardBuilder({ initialPgn, onPgnChange });

  const currentPathKey = builder.path.join('.');

  return (
    <div className="space-y-2">
      <div className={INLINE_BOARD_CARD_CHROME}>
        <div className="relative">
          {/* The move tree as wrapping PGN-style text; the cursor's move is
              highlighted, every move navigates the board to its position. */}
          <div className="min-h-9 px-2 py-1.5 text-sm leading-7">
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
            flipped={side === 'black'}
            playerSide={side}
            lastMove={builder.lastMove}
            onMove={builder.handleMove}
            movablePieces="side-to-move"
            showCoordinates
            boardTheme="lichess"
            rounded={false}
          />

          <div className="flex items-center justify-between gap-2 px-2 py-1">
            <span className="w-24 text-xs text-muted-foreground">
              {t(builder.turn === 'w' ? 'boardBuilder.whiteToMove' : 'boardBuilder.blackToMove')}
            </span>
            <MoveNavigationControls
              onNavigateToStart={builder.goToStart}
              onNavigatePrevious={builder.goBack}
              onNavigateNext={builder.goForward}
              onNavigateToEnd={builder.goToEnd}
              isPreviousDisabled={builder.isAtStart}
              isNextDisabled={!builder.hasNext}
            />
            <div className="flex w-24 justify-end">
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
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{t('boardBuilder.help')}</p>
    </div>
  );
}
