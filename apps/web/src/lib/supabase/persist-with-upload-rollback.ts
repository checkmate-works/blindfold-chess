type StorageRemovalResult = { error: unknown | null };

export type PersistWithUploadRollbackResult<T> =
  { ok: true; value: T } | { ok: false; error: unknown; rollbackError: unknown | null };

/**
 * Persist metadata for an object that was already uploaded, removing that
 * object when persistence fails so Storage and the database cannot drift.
 */
export async function persistWithUploadRollback<T>({
  persist,
  rollback,
}: {
  persist: () => Promise<T>;
  rollback: () => Promise<StorageRemovalResult>;
}): Promise<PersistWithUploadRollbackResult<T>> {
  try {
    return { ok: true, value: await persist() };
  } catch (error) {
    try {
      const { error: rollbackError } = await rollback();
      return { ok: false, error, rollbackError };
    } catch (rollbackError) {
      return { ok: false, error, rollbackError };
    }
  }
}
