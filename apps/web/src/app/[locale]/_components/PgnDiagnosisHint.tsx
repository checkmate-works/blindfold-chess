'use client';

import { useEffect, useState } from 'react';

import { FieldError } from '@/app/_components';
import { diagnosePgn } from '@blindfold-chess/features/chess-core';
import type { PgnDiagnosis } from '@blindfold-chess/features/chess-core';

import { usePgnDiagnosisMessage } from '@/app/[locale]/_hooks/use-pgn-diagnosis-message';

/**
 * Pause after the last keystroke before judging the text. Mid-typing a PGN is
 * almost always momentarily illegal ("1. e" is not a move), so validating per
 * keystroke would flash a red line at an author who is doing nothing wrong. A
 * paste — the way most PGNs arrive — is a single change, so this only delays
 * the message that matters by the pause.
 */
const DEBOUNCE_MS = 600;

type Props = {
  /** The form's current PGN text. */
  pgn: string;
  /** Ties the message to the control it describes (`aria-describedby`). */
  id: string;
};

/**
 * Inline verdict on a PGN a form currently holds, for surfaces whose own
 * validation is silent about *why* a paste was rejected.
 *
 * It exists because an unparseable PGN used to fail without a word: the kata
 * board builder drops text it cannot replay and shows the starting position
 * instead (see `builderTreeFromPgn`), so pasting a game with one bad move
 * looked exactly like pasting nothing, and the only complaint came from the
 * server after a submit — as "could not be read", with no clue where.
 *
 * Deliberately advisory, not a gate: it never blocks submitting, so a
 * disagreement between this check and the server's leaves the author with the
 * server's answer rather than a button that refuses without explanation.
 */
export function PgnDiagnosisHint({ pgn, id }: Props) {
  const format = usePgnDiagnosisMessage();
  const [diagnosis, setDiagnosis] = useState<PgnDiagnosis | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDiagnosis(diagnosePgn(pgn)), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [pgn]);

  return <FieldError id={id} message={format(diagnosis)} />;
}
