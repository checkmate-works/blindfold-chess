'use client';

import { useMemo, useState } from 'react';

import type { Side } from '@blindfold-chess/types';

import { MoveReferencePreviewModal } from '@/app/[locale]/(public)/games/shared/[id]/_components/MoveReferencePreviewModal';
import { LinkedText } from '@/app/[locale]/_components/LinkedText';

import type { FenMoveSegment } from '../_lib/move-references-from-fen';
import { parseMoveReferencesFromFen } from '../_lib/move-references-from-fen';

type Props = {
  text: string;
  locale: string;
  /** Base position every move reference in this body branches from. */
  fen: string;
};

/**
 * Move-notation-aware replacement for `LinkedText` on comment bodies anchored
 * to a single position (chunks). In addition to URL linkification (still
 * delegated to `LinkedText` for each plain-text slice), a legal SAN run like
 * "Bxa7" or "Bxa7 b6" written against `fen` becomes a button that opens a
 * board preview modal for that branch. Reuses the games feature's
 * `MoveReferencePreviewModal`; with `startingFen === fen` and `basePly === 0`
 * its step labels derive their move numbers straight from the FEN's own
 * side-to-move + fullmove fields.
 */
export function CommentMoveBody({ text, locale, fen }: Props) {
  const [openRef, setOpenRef] = useState<Extract<FenMoveSegment, { type: 'moveRef' }> | null>(null);

  // Parsing validates candidate runs with chess.js, so gate it behind a memo —
  // the thread re-renders on every optimistic update and the inputs only
  // change when the comment itself is edited.
  const segments = useMemo(() => parseMoveReferencesFromFen(text, fen), [text, fen]);

  // Orient the preview board to the side to move, matching the chunk thumbnail
  // (which flips when Black is to move).
  const orientation: Side = fen.split(' ')[1] === 'b' ? 'black' : 'white';

  if (segments.length === 1 && segments[0].type === 'text') {
    return <LinkedText text={text} locale={locale} />;
  }

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
          onClose={() => setOpenRef(null)}
          raw={openRef.raw}
          sans={openRef.sans}
          baseFen={fen}
          basePly={0}
          startingFen={fen}
          playerColor={orientation}
        />
      )}
    </>
  );
}
