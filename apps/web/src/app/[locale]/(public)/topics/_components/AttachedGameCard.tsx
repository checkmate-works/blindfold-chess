'use client';

import { useCallback, useMemo, useState } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import {
  getFenAfterMoves,
  getStartingFen,
  parsePgnWithFen,
} from '@blindfold-chess/features/chess-core';

import { MiniBoard } from '@/app/[locale]/(public)/topics/openings/_components/MiniBoard';

/**
 * Subset of `topic_post_attachments` columns that the card needs.
 *
 * @design Component contract
 *
 * `AttachedGameCard` MUST only ever be rendered for attachments whose
 * parent topic_post is non-soft-deleted. The visibility rule is enforced
 * by (a) the RLS SELECT policy on `topic_post_attachments`, (b) the
 * application-layer query that filters `topic_posts.deleted_at IS NULL`,
 * and (c) this contract — three layers of defense per SPEC1 §5-1.
 */
export type AttachedGameCardData = {
  id: string;
  source: string; // 'pgn' | 'lichess'
  sourceUrl: string | null;
  sourceGameId: string | null;
  pgn: string;
  moveCount: number;
  headerWhite: string | null;
  headerBlack: string | null;
  headerResult: string | null;
  headerEvent: string | null;
  headerDate: string | null;
  anonymized: boolean;
};

type Props = {
  attachment: AttachedGameCardData;
};

export function AttachedGameCard({ attachment }: Props) {
  const t = useTranslations('attachment');
  const [expanded, setExpanded] = useState(false);

  const parsed = useMemo(() => {
    try {
      return parsePgnWithFen(attachment.pgn);
    } catch {
      // Defensive: validateAttachedPgn already accepted this PGN at write
      // time, so a parse failure here means the row is corrupt or chess.js
      // changed behavior. Fall back to no-moves rather than crashing the
      // whole post.
      return { moves: [] as string[], startingFen: undefined };
    }
  }, [attachment.pgn]);

  const startingFen = parsed.startingFen ?? getStartingFen();

  // Initial board: position after the last played move, so the thumbnail
  // shows the most informative state.
  const finalFen = useMemo(
    () => getFenAfterMoves(startingFen, parsed.moves),
    [startingFen, parsed.moves]
  );

  // Move index: -1 = before any move; 0..moves.length-1 = after that move.
  const [moveIndex, setMoveIndex] = useState<number>(parsed.moves.length - 1);
  const currentFen = useMemo(() => {
    if (moveIndex === -1) return startingFen;
    if (moveIndex === parsed.moves.length - 1) return finalFen;
    return getFenAfterMoves(startingFen, parsed.moves.slice(0, moveIndex + 1));
  }, [moveIndex, parsed.moves, startingFen, finalFen]);

  const handleToggle = useCallback(() => {
    setExpanded((prev) => !prev);
    // Reset to last move when re-opening so thumbnail and replay agree.
    setMoveIndex(parsed.moves.length - 1);
  }, [parsed.moves.length]);

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

  // Build the source attribution. For Lichess we always use the
  // re-built canonical URL — never the raw `headerSite` value.
  const sourceLabel = (() => {
    if (attachment.source === 'lichess' && attachment.sourceGameId) {
      return {
        label: `lichess.org/${attachment.sourceGameId}`,
        href: attachment.sourceUrl ?? `https://lichess.org/${attachment.sourceGameId}`,
      };
    }
    return null;
  })();

  return (
    <div className="mt-2 mb-2 rounded-md border border-border bg-card overflow-hidden">
      <div className="p-3 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 gap-2">
          <div className="w-32 shrink-0 mx-auto sm:mx-0">
            <MiniBoard fen={expanded ? currentFen : finalFen} responsive />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            {(attachment.headerWhite || attachment.headerBlack) && (
              <p className="text-sm font-medium text-foreground truncate">
                <span>{attachment.headerWhite ?? '?'}</span>
                <span className="text-muted-foreground"> vs </span>
                <span>{attachment.headerBlack ?? '?'}</span>
                {attachment.headerResult && attachment.headerResult !== '*' && (
                  <span className="text-muted-foreground ml-2">{attachment.headerResult}</span>
                )}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {t('card.movesCount', { count: attachment.moveCount })}
            </p>
            {attachment.headerEvent && (
              <p className="text-xs text-muted-foreground truncate">
                <span className="font-medium">{t('card.headerEvent')}: </span>
                <span>{attachment.headerEvent}</span>
              </p>
            )}
            {attachment.headerDate && (
              <p className="text-xs text-muted-foreground truncate">
                <span className="font-medium">{t('card.headerDate')}: </span>
                <span>{attachment.headerDate}</span>
              </p>
            )}
            <button
              type="button"
              onClick={handleToggle}
              className="text-sm text-link-primary hover:underline"
            >
              {expanded ? t('card.collapseButton') : t('card.replayButton')}
            </button>
          </div>
        </div>

        {expanded && parsed.moves.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border">
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
                        onClick={() =>
                          pair.blackIndex !== undefined && setMoveIndex(pair.blackIndex)
                        }
                      >
                        {pair.blackMove}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {sourceLabel && (
          <p className="text-xs text-muted-foreground pt-1">
            <span>{t('card.sourceLabel')}: </span>
            <a
              href={sourceLabel.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-link-primary hover:underline"
            >
              {sourceLabel.label}
            </a>
          </p>
        )}

        {attachment.anonymized && (
          <p className="text-xs text-muted-foreground italic">{t('card.anonymizedNote')}</p>
        )}
      </div>
    </div>
  );
}
