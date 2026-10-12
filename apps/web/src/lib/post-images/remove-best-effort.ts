import { POST_IMAGES_BUCKET } from './validation';

/**
 * Minimal supabase-client surface needed to remove post images. Captured as a
 * structural type so callers can pass either the user-scoped session client
 * or the admin (service-role) client without pulling in either supabase
 * factory directly.
 */
export type StorageBucketClient = {
  storage: {
    from: (bucket: string) => {
      remove: (paths: string[]) => Promise<{ error: { message: string } | null }>;
    };
  };
};

/**
 * Remove objects from the post-images bucket, logging instead of throwing on
 * failure. For callers whose Postgres change is already the source of truth:
 * a failed remove must not undo it, and the daily reaper
 * (`./reap-orphaned-images`) sweeps any bytes that survive within 7 days.
 *
 * The client may be passed as a promise so a caller that creates it on the
 * spot gets a failure to create it treated the same as a failed remove.
 * `context` is merged into both log lines to identify the post.
 */
export async function removePostImagesBestEffort(
  storageClient: StorageBucketClient | Promise<StorageBucketClient>,
  paths: string[],
  logPrefix: string,
  context: Record<string, unknown>
): Promise<void> {
  try {
    const { error } = await (await storageClient).storage.from(POST_IMAGES_BUCKET).remove(paths);
    if (error) {
      console.warn(`${logPrefix}: storage remove returned error`, {
        ...context,
        message: error.message,
      });
    }
  } catch (err) {
    console.warn(`${logPrefix}: storage remove threw`, {
      ...context,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
