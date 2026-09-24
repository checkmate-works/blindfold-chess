/**
 * The openings an imported repertoire links to, and who chose them.
 *
 * - `auto` — the links follow the pasted PGN: the form re-detects them from
 *   the moves and writes them here. The initial state.
 * - `manual` — the author picked or removed an opening by hand. From then on
 *   the PGN no longer drives the links: detection is a starting point, not a
 *   correction, so a later edit to the moves must not undo the author's pick.
 *
 * Holding the source next to the ids — rather than in a ref beside them —
 * lets the reducer refuse a detection once the author has taken over, which
 * also covers a detection that was already scheduled when the pick happened.
 */
export type OpeningLinksState = { source: 'auto' | 'manual'; ids: string[] };

export type OpeningLinksAction =
  { type: 'detected'; ids: string[] } | { type: 'picked'; ids: string[] } | { type: 'cleared' };

export const INITIAL_OPENING_LINKS: OpeningLinksState = { source: 'auto', ids: [] };

/**
 * - `detected` applies only while the source is `auto`.
 * - `picked` sets the ids and hands the links to the author for good.
 * - `cleared` empties the ids (the phase stopped being `opening`) and keeps
 *   the source — switching phase is not the author choosing openings.
 *
 * An action that changes nothing returns the same state object, so React
 * skips the re-render.
 */
export function openingLinksReducer(
  state: OpeningLinksState,
  action: OpeningLinksAction
): OpeningLinksState {
  switch (action.type) {
    case 'detected':
      if (state.source !== 'auto' || sameIds(state.ids, action.ids)) return state;
      return { source: 'auto', ids: action.ids };
    case 'picked':
      return { source: 'manual', ids: action.ids };
    case 'cleared':
      return state.ids.length === 0 ? state : { ...state, ids: [] };
  }
}

function sameIds(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}
