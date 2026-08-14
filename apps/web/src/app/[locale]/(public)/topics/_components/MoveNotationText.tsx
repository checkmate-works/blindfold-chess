'use client';

import { useMemo, useState } from 'react';

import { isBlackToMoveFromFen } from '@blindfold-chess/features/chess-core/fen';
import type { Side } from '@blindfold-chess/types';

import { MoveReferencePreviewModal } from '@/app/[locale]/(public)/games/shared/[id]/_components/MoveReferencePreviewModal';
import { MoveSegmentText } from '@/app/[locale]/_components/MoveSegmentText';

import type { FenMoveSegment } from '../_lib/move-references-from-fen';
import { parseMoveReferencesFromFen } from '../_lib/move-references-from-fen';

type Props = {
  text: string;
  locale: string;
  /** Base position every move reference in this body branches from. */
  fen: string;
};

/**
 * Move-notation-aware replacement for `LinkedText` on any text anchored to a
 * single base position — comment bodies AND entity descriptions (chunk,
 * puzzle, position-memory, repertoire, shared-game), all of which describe a
 * line branching from one position. In addition to URL linkification (still
 * delegated to `LinkedText` for each plain-text slice), a legal SAN run like
 * "Bxa7" or "Bxa7 b6" written against `fen` becomes a button that opens a
 * board preview modal for that branch. Reuses the games feature's
 * `MoveReferencePreviewModal`; with `startingFen === fen` and `basePly === 0`
 * its step labels derive their move numbers straight from the FEN's own
 * side-to-move + fullmove fields.
 */
export function MoveNotationText({ text, locale, fen }: Props) {
  const [openRef, setOpenRef] = useState<Extract<FenMoveSegment, { type: 'moveRef' }> | null>(null);

  // Parsing validates candidate runs with chess.js, so gate it behind a memo —
  // the thread re-renders on every optimistic update and the inputs only
  // change when the comment itself is edited.
  const segments = useMemo(() => parseMoveReferencesFromFen(text, fen), [text, fen]);

  // Orient the preview board to the side to move, matching the chunk thumbnail
  // (which flips when Black is to move).
  const orientation: Side = isBlackToMoveFromFen(fen) ? 'black' : 'white';

  return (
    <>
      <MoveSegmentText text={text} segments={segments} locale={locale} onSelect={setOpenRef} />

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
