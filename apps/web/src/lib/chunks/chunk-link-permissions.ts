/**
 * Who may remove a chunk link.
 *
 * Anyone signed in can suggest a link, so removal has to answer to two
 * parties: the member who suggested it, and the owner of the thing it was
 * attached to — a shared game or a repertoire. The rule was written out
 * once per surface, and the two copies had drifted only in the name of the
 * owner column, which is exactly the kind of difference that hides a real
 * one.
 *
 * An anonymised owner (`null`) matches nobody: the caller is always a
 * signed-in member, so the comparison rejects it without a separate guard.
 */
export function canDeleteChunkLink(
  link: { suggestedById: string | null; parentOwnerId: string | null },
  userId: string
): boolean {
  return link.suggestedById === userId || link.parentOwnerId === userId;
}
