'use client';

import { useEffect, useRef, useState } from 'react';

import { formatMoveAnchor } from '@blindfold-chess/features/chess-core/move-numbering';

import { useAiReplyChip } from '@/app/[locale]/(public)/games/play/_components/AiReplyChip';

import type { MoveLogEntry } from '../_lib';

/**
 * Announce the opponent's auto-filled move (from "Auto-fill opponent's
 * moves") for the on-board chip, mirroring games/play's AiReplyChip: watch
 * the move log for a newly appended `auto` entry, format its notation, and
 * drive the chip's show/auto-dismiss state machine via `useAiReplyChip`.
 * The page title stays reserved for the player's OWN correct/incorrect
 * feedback, so the two never compete for the same slot.
 */
export function useOpponentMoveAnnouncement({
  entries,
  durationMs,
}: {
  entries: MoveLogEntry[];
  /** Auto-dismiss window in ms; `0` (or negative) means never auto-dismiss. */
  durationMs: number;
}): { notation: string | null; active: boolean; dismiss: () => void } {
  const previousLengthRef = useRef(entries.length);
  const [notation, setNotation] = useState<string | null>(null);
  const [signal, setSignal] = useState(0);
  useEffect(() => {
    if (entries.length > previousLengthRef.current) {
      const newEntry = entries[entries.length - 1];
      if (newEntry.status === 'auto') {
        setNotation(
          `${formatMoveAnchor(newEntry.moveNumber, newEntry.isWhiteMove)} ${newEntry.move}`
        );
        setSignal((s) => s + 1);
      }
    }
    previousLengthRef.current = entries.length;
  }, [entries]);

  const { active, dismiss } = useAiReplyChip({
    isAiThinking: false,
    aiMoveSignal: signal,
    durationMs,
  });

  return { notation, active, dismiss };
}
