import type { MoveLogEntry } from "./move-log-entry";

/**
 * Wrong attempts on one move after which the review offers to reveal the
 * answer. Below it the "I don't know" button sits quietly under the input;
 * from it on, a one-line prompt appears and the button takes the primary
 * style.
 *
 * The offer is inline rather than a modal on purpose. Giving up is recorded
 * as `skipped`, which counts against the recall rate, while a move finally
 * recalled after any number of wrong attempts still counts as recalled — so a
 * dialog that takes focus mid-typing turns a stray Enter or tap into an
 * unrecoverable miss, and it interrupts a reviewer who wants to keep trying.
 */
export const DONT_KNOW_PROMPT_THRESHOLD = 3;

/**
 * "I don't know" presses in one session after which "Auto-fill All" is
 * offered next to the button: a reviewer who has given up on two moves is
 * likely stuck on the rest of the game too.
 */
export const AUTO_FILL_ALL_THRESHOLD = 2;

/**
 * Number of wrong attempts entered for the move currently being resolved.
 *
 * The log is an ordered stream in which `incorrect` entries precede the
 * resolution of the move they belong to, and every resolution (`correct`,
 * `skipped`, `autoFilled`, `auto`) appends a non-`incorrect` entry. The
 * attempts on the unresolved move are therefore exactly the trailing run of
 * `incorrect` entries — no separate counter to keep in sync with the log.
 */
export function countCurrentMoveMistakes(
  entries: readonly MoveLogEntry[],
): number {
  let count = 0;
  for (
    let i = entries.length - 1;
    i >= 0 && entries[i].status === "incorrect";
    i--
  ) {
    count++;
  }
  return count;
}
