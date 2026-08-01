'use client';

import { useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';

import { FieldError } from '@/app/_components';

import type { PgnFormError } from '@/lib/repertoires/pgn-parse-error';
import { findPgnFormError } from '@/lib/repertoires/pgn-parse-error';

/**
 * Pause after the last keystroke before judging the text. Mid-typing a PGN is
 * almost always momentarily illegal ("1. e" is not a move), so validating per
 * keystroke would flash a red line at an author who is doing nothing wrong. A
 * paste — the way most PGNs arrive — is a single change, so this only delays
 * the message that matters by the pause.
 */
const DEBOUNCE_MS = 600;

type Props = {
  /** The form's current PGN text, in either input mode. */
  pgn: string;
  /** Ties the message to the control it describes (`aria-describedby`). */
  id: string;
};

/**
 * Inline verdict on the PGN a kata form currently holds.
 *
 * It exists because an unparseable PGN used to fail silently: the board
 * builder drops text it cannot replay and shows the starting position instead
 * (see `builderTreeFromPgn`), so pasting a game with one bad move looked
 * exactly like pasting nothing, and the only complaint came from the server
 * after a submit — as "could not be read", with no clue where. The parser now
 * locates the offending move and this renders that location, wording it as
 * Lichess does ("Can't play d7 at move 8, ply 16") since that is where these
 * PGNs are usually exported from.
 *
 * Deliberately advisory, not a gate: it never blocks submitting, so a
 * disagreement between this check and the server's leaves the author with the
 * server's answer rather than a button that refuses without explanation.
 */
export function PgnParseHint({ pgn, id }: Props) {
  const t = useTranslations('Repertoires.form');
  const [error, setError] = useState<PgnFormError | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setError(findPgnFormError(pgn)), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [pgn]);

  if (!error) return null;

  return (
    <FieldError
      id={id}
      message={
        error.kind === 'illegalMove'
          ? t('pgnErrorIllegalMove', {
              san: error.san,
              // Strings, not numbers: these are notation, and a numeric
              // argument would pick up locale digit grouping ("1,024").
              moveNumber: String(error.moveNumber),
              ply: String(error.ply),
            })
          : t('pgnErrorUnreadable')
      }
    />
  );
}
