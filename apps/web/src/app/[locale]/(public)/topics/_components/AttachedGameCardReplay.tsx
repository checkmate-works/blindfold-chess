'use client';

import { useMemo, useState } from 'react';

import {
  getFenAfterMoves,
  getStartingFen,
  parsePgnWithFen,
} from '@blindfold-chess/features/chess-core';

import { MiniBoard } from '@/app/[locale]/(public)/topics/openings/_components/MiniBoard';

/**
 * Per-move replay UI for an attached game.
 *
 * @description
 * This module is the chess.js-bearing half of `AttachedGameCard`.
 * It is intentionally split out so the summary card (FEN thumbnail
 * + headers + "Open replay" button) can render without pulling
 * `chess.js` (~60KB min) into the chunk page's first-paint client
 * bundle. The summary loads this component lazily via
 * `next/dynamic({ ssr: false })` only after the user clicks the
 * replay button. See SPEC1 §5-1 ("初期はサムネイルのみ + 詳細展開時のみ
 * リプレイ UI を lazy ロード").
 */
type Props = {
  pgn: string;
  /** Pre-computed final-position FEN (server-supplied), used as the
   * fallback initial display before the user moves through the
   * replay so the lazy load is visually seamless. */
  fallbackFen: string;
};

export function AttachedGameCardReplay({ pgn, fallbackFen }: Props) {
  const parsed = useMemo(() => {
    try {
      return parsePgnWithFen(pgn);
    } catch {
      // Defensive: validateAttachedPgn already accepted this PGN at
      // write time, so a parse failure here means the row is corrupt
      // or chess.js changed behavior. Fall back to no-moves rather
      // than crashing the whole post.
      return { moves: [] as string[], startingFen: undefined };
    }
  }, [pgn]);

  const startingFen = parsed.startingFen ?? getStartingFen();

  // Move index: -1 = before any move; 0..moves.length-1 = after that move.
  const [moveIndex, setMoveIndex] = useState<number>(parsed.moves.length - 1);
  const currentFen = useMemo(() => {
    if (moveIndex === -1) return startingFen;
    if (moveIndex === parsed.moves.length - 1) return fallbackFen;
    return getFenAfterMoves(startingFen, parsed.moves.slice(0, moveIndex + 1));
  }, [moveIndex, parsed.moves, startingFen, fallbackFen]);

  const movePairs = useMemo(() => {
    const pairs: {
      moveNumber: number;
      whiteMove: string;
      whiteIndex: number;
      blackMove?: string;
      blackIndex?: number;
    }[] = [];
    for (let i = 0; i < parsed.moves.length; i += 2) {
      pairs.push({
        moveNumber: Math.floor(i / 2) + 1,
        whiteMove: parsed.moves[i],
        whiteIndex: i,
        blackMove: parsed.moves[i + 1],
        blackIndex: i + 1 < parsed.moves.length ? i + 1 : undefined,
      });
    }
    return pairs;
  }, [parsed.moves]);

  if (parsed.moves.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 pt-2 border-t border-border">
      <div className="w-32 shrink-0 mx-auto sm:mx-0">
        <MiniBoard fen={currentFen} responsive />
      </div>
      <div className="flex justify-center gap-1">
        <button
          type="button"
          onClick={() => setMoveIndex(-1)}
          disabled={moveIndex === -1}
          className="w-9 h-9 flex items-center justify-center hover:bg-muted rounded transition-colors disabled:opacity-50 disabled:hover:bg-transparent font-mono text-lg"
          aria-label="Go to start"
        >
          &laquo;
        </button>
        <button
          type="button"
          onClick={() => setMoveIndex((i) => Math.max(-1, i - 1))}
          disabled={moveIndex === -1}
          className="w-9 h-9 flex items-center justify-center hover:bg-muted rounded transition-colors disabled:opacity-50 disabled:hover:bg-transparent font-mono text-lg"
          aria-label="Previous move"
        >
          &lsaquo;
        </button>
        <button
          type="button"
          onClick={() => setMoveIndex((i) => Math.min(parsed.moves.length - 1, i + 1))}
          disabled={moveIndex === parsed.moves.length - 1}
          className="w-9 h-9 flex items-center justify-center hover:bg-muted rounded transition-colors disabled:opacity-50 disabled:hover:bg-transparent font-mono text-lg"
          aria-label="Next move"
        >
          &rsaquo;
        </button>
        <button
          type="button"
          onClick={() => setMoveIndex(parsed.moves.length - 1)}
          disabled={moveIndex === parsed.moves.length - 1}
          className="w-9 h-9 flex items-center justify-center hover:bg-muted rounded transition-colors disabled:opacity-50 disabled:hover:bg-transparent font-mono text-lg"
          aria-label="Go to end"
        >
          &raquo;
        </button>
      </div>
      <div className="overflow-x-auto">
        <div className="flex items-center gap-1 text-xs whitespace-nowrap justify-center flex-wrap">
          {movePairs.map((pair) => (
            <div key={pair.moveNumber} className="flex items-center gap-0.5">
              <span className="text-muted-foreground">{pair.moveNumber}.</span>
              <button
                type="button"
                className={`px-1 py-0.5 rounded transition-colors ${
                  moveIndex === pair.whiteIndex
                    ? 'bg-foreground/15 font-semibold'
                    : 'hover:bg-muted/40'
                }`}
                onClick={() => setMoveIndex(pair.whiteIndex)}
              >
                {pair.whiteMove}
              </button>
              {pair.blackMove && pair.blackIndex !== undefined && (
                <button
                  type="button"
                  className={`px-1 py-0.5 rounded transition-colors ${
                    moveIndex === pair.blackIndex
                      ? 'bg-foreground/15 font-semibold'
                      : 'hover:bg-muted/40'
                  }`}
                  onClick={() => pair.blackIndex !== undefined && setMoveIndex(pair.blackIndex)}
                >
                  {pair.blackMove}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
