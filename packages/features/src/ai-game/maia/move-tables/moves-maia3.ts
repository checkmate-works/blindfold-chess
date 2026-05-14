/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Maia 3 move-index tables. The companion `.json` files (forward and
 * reverse) are copied verbatim from CSSLab/maia-platform-frontend
 * (GPL-3.0) under `src/lib/engine/data/`.
 *
 * Forward map  : UCI string ("e2e4", "a7a8q", ...) → policy index [0, 4352)
 * Reverse map  : policy index → UCI string
 *
 * Both maps are loaded as JSON at build time, so this file is the single
 * point of import for the rest of the Maia adapter — keeping the JSON
 * "data files" reachable only via typed helpers.
 */

import forwardJson from "./moves-maia3.json";
import reverseJson from "./moves-maia3-reversed.json";

import { MAIA3_POLICY_SIZE } from "../types";

const forwardMap: Readonly<Record<string, number>> = forwardJson;
const reverseMap: Readonly<Record<string, string>> = reverseJson;

if (Object.keys(forwardMap).length !== MAIA3_POLICY_SIZE) {
  // Defensive guard: an upstream-version mismatch between the JSON tables
  // and the model output shape would produce silently wrong moves.
  throw new Error(
    `Maia 3 move table length mismatch: expected ${MAIA3_POLICY_SIZE} entries, got ${Object.keys(forwardMap).length}`,
  );
}

/**
 * Look up the Maia 3 policy index for a UCI move. Returns `undefined`
 * when the move is not part of the (heavily-pruned) Maia 3 vocabulary —
 * callers should treat this as "skip this legal move" rather than
 * surfacing it as an error, since legal-but-out-of-vocabulary moves
 * exist (extremely rare under-promotions, for example).
 */
export function maia3MoveToIndex(uciMove: string): number | undefined {
  return forwardMap[uciMove];
}

/**
 * Look up the UCI move for a Maia 3 policy index. Returns `undefined`
 * for out-of-range indices.
 */
export function maia3IndexToMove(index: number): string | undefined {
  return reverseMap[String(index)];
}
