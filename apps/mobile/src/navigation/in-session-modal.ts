/** The group of the full-screen session modal, as `useSegments` names it. */
const SESSION_GROUP = "(session)";

/** Whether a screen with these route segments is inside the session modal. */
export function isInSessionModal(segments: readonly string[]): boolean {
  return segments[0] === SESSION_GROUP;
}
