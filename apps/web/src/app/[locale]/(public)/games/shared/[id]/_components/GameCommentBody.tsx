'use client';

import { useMemo, useState } from 'react';

import type { Side } from '@blindfold-chess/types';

import { parseFenMeta } from '@/app/[locale]/(public)/games/play/_lib/fen-utils';
import { LinkedText } from '@/app/[locale]/_components/LinkedText';

import type { CommentTextSegment } from '../_lib/comment-move-references';
import { parseCommentMoveReferences } from '../_lib/comment-move-references';
import { MoveReferencePreviewModal } from './MoveReferencePreviewModal';

type Props = {
  text: string;
  locale: string;
  /** The game's actual SAN moves — a move reference branches off these. */
  moves: string[];
  startingFen: string | null;
  playerColor: Side;
};

/**
 * Drop-in replacement for `LinkedText` on game comment bodies: in addition to
 * URL linkification (still delegated to `LinkedText` for each plain-text
 * slice), a PGN-style move reference like "8. Bd3" or a fused run like
 * "8. Bd3 Bb7 9. O-O" becomes a button that opens a board preview modal for
 * that (possibly hypothetical) branch.
 */
export function GameCommentBody({ text, locale, moves, startingFen, playerColor }: Props) {
  const [openRef, setOpenRef] = useState<Extract<CommentTextSegment, { type: 'moveRef' }> | null>(
    null
  );

  // Parsing replays the game with chess.js, so gate it behind a memo — the
  // thread re-renders on every optimistic update / navigation step, and the
  // inputs only change when the comment itself is edited.
  const segments = useMemo(
    () => parseCommentMoveReferences(text, moves, startingFen),
    [text, moves, startingFen]
  );

  if (segments.length === 1 && segments[0].type === 'text') {
    return <LinkedText text={text} locale={locale} />;
  }

  const { startsAsBlack, startMoveNumber } = parseFenMeta(startingFen);

  return (
    <>
      {segments.map((segment, i) =>
        segment.type === 'text' ? (
          <LinkedText key={i} text={segment.value} locale={locale} />
        ) : (
          <button
            key={i}
            type="button"
            onClick={() => setOpenRef(segment)}
            className="underline decoration-dotted underline-offset-2 hover:text-primary transition-colors"
          >
            {segment.raw}
          </button>
        )
      )}

      {openRef && (
        <MoveReferencePreviewModal
          isOpen
          onClose={() => setOpenRef(null)}
          raw={openRef.raw}
          sans={openRef.sans}
          baseFen={openRef.baseFen}
          basePly={openRef.basePly}
          startsAsBlack={startsAsBlack}
          startMoveNumber={startMoveNumber}
          playerColor={playerColor}
        />
      )}
    </>
  );
}
