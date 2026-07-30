/**
 * The fields whose change alters what an existing reference asserts.
 * Description and annotations are excluded on purpose: they elaborate the
 * pattern rather than identify it, so changing them cannot invalidate
 * someone's "this position exhibits X".
 */
export type ChangedIdentityField = 'title' | 'slug' | 'fen';

/** The identity-bearing subset of a chunk — saved row or pending draft. */
export type ChunkIdentity = {
  title: string;
  slug: string;
  representativeFen: string;
};

/**
 * Which identity fields the pending edit actually changes, in the order
 * they are named in the warning copy.
 *
 * Compared on trimmed values because that is what gets persisted — a
 * trailing space the author never sees is not a rename, and reporting it
 * as one would put a warning in front of an edit that changes nothing.
 */
export function diffChunkIdentity(
  saved: ChunkIdentity,
  pending: ChunkIdentity
): ChangedIdentityField[] {
  const changed: ChangedIdentityField[] = [];
  if (pending.title.trim() !== saved.title.trim()) changed.push('title');
  if (pending.slug.trim() !== saved.slug.trim()) changed.push('slug');
  if (pending.representativeFen.trim() !== saved.representativeFen.trim()) changed.push('fen');
  return changed;
}
