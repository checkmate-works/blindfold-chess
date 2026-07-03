/** Old → new value pairs for the fields an in-place edit overwrote. */
export type FieldChanges = Record<string, { from: string | null; to: string | null }>;

/**
 * Diff the overwritten fields (old → new) so the activity log keeps the
 * prior values an in-place edit discarded (UGC rows keep no revision
 * history). Values are normalized with `?? null` on both sides so an absent
 * field and an explicit null compare equal. Fields that did not change are
 * omitted — an empty result means nothing worth logging.
 */
export function diffFields<K extends string>(
  prev: Partial<Record<K, string | null>>,
  next: Partial<Record<K, string | null>>,
  keys: readonly K[]
): FieldChanges {
  const changes: FieldChanges = {};
  for (const key of keys) {
    const from = prev[key] ?? null;
    const to = next[key] ?? null;
    if (from !== to) {
      changes[key] = { from, to };
    }
  }
  return changes;
}
