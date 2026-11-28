/** A route of a stack navigator's state, as these helpers read it. */
type StackRoute = { name: string; params?: object };

/** The part of a stack navigator's state these helpers read. */
type StackState = {
  index: number;
  routes: readonly StackRoute[];
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
  return routeBelow(state)?.name;
}

/**
 * The route directly under the focused one, with its params, for a screen
 * whose copies differ only by param (one guide per rank): the name alone
 * cannot tell whether the copy underneath is the one being linked to.
 */
export function routeBelow(
  state: StackState | undefined,
): StackRoute | undefined {
  if (!state || state.index < 1) return undefined;
  return state.routes[state.index - 1];
}
