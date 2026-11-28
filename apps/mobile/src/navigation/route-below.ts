/** The part of a stack navigator's state `routeNameBelow` reads. */
type StackState = {
  index: number;
  routes: readonly { name: string }[];
};

/**
 * The name of the route directly under the focused one, or `undefined` when
 * the focused route is the first.
 *
 * @description
 * A screen that links to a place the user may have come from (My Records'
 * "Take the Challenge", opened from that challenge's setup) checks this
 * first: if the place is right underneath, going back to it beats pushing a
 * second copy, which would leave the back button walking through
 * setup → records → setup → records.
 */
export function routeNameBelow(
  state: StackState | undefined,
): string | undefined {
  if (!state || state.index < 1) return undefined;
  return state.routes[state.index - 1]?.name;
}
