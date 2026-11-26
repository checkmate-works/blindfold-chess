"use client";

import { useCallback, useEffect, useState } from "react";

import { useLatestRef } from "../common/use-latest-ref";

/**
 * How long the AI's move stays announced when the caller passes no duration.
 * Equal to the default of the `aiReplyDuration` game preference.
 */
const MOVE_VISIBLE_MS = 5000;

/**
 * Visibility state machine for the announcement of the AI's reply ("AI is
 * thinking…", then "AI played …"), separate from whatever draws it so the
 * surrounding screen can coordinate with it: the web hides the blindfold
 * mask's centre label while the chip is `active`, the mobile app swaps its
 * status line.
 *
 * - `thinking`: the AI is computing.
 * - `active`: the announcement is showing (thinking, or within the window
 *   after a move). `aiMoveSignal` bumps once per AI move; the move stays for
 *   `durationMs`, then `active` clears. A `durationMs` of `0` keeps the move
 *   announced until the next reply.
 * - `dismiss`: clears the move announcement on demand. Called when the player
 *   reveals the board (peek): once the position is visible the "AI played …"
 *   label is redundant, and with `durationMs === 0` it would otherwise linger
 *   over the open board forever.
 */
export function useAiReplyChip({
  isAiThinking,
  aiMoveSignal,
  durationMs = MOVE_VISIBLE_MS,
}: {
  isAiThinking: boolean;
  aiMoveSignal: number;
  /** Auto-dismiss window in ms; `0` (or negative) means never auto-dismiss. */
  durationMs?: number;
}): { active: boolean; thinking: boolean; dismiss: () => void } {
  const [moveVisible, setMoveVisible] = useState(false);

  // Read `durationMs` through a ref so it is NOT an effect dependency: only a
  // new `aiMoveSignal` should (re)show the chip. If `durationMs` were a dep,
  // changing the AI-display-time setting would re-run the effect and re-show a
  // move that had already been dismissed (e.g. by a board reveal) or expired.
  const durationRef = useLatestRef(durationMs);

  useEffect(() => {
    if (!aiMoveSignal) return;
    setMoveVisible(true);
    const ms = durationRef.current;
    // ms <= 0 → keep the move visible until the next reply re-triggers this
    // effect; skip the auto-dismiss timer entirely.
    if (ms <= 0) return;
    const id = setTimeout(() => setMoveVisible(false), ms);
    return () => clearTimeout(id);
  }, [aiMoveSignal, durationRef]);

  const dismiss = useCallback(() => setMoveVisible(false), []);

  return {
    active: isAiThinking || moveVisible,
    thinking: isAiThinking,
    dismiss,
  };
}
