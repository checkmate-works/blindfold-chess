'use server';

import { revalidatePath } from 'next/cache';

/**
 * Revalidate the Full Route Cache for `path` after a client-driven image
 * upload.
 *
 * The PGN / FEN attach flows run inside a Server Action, so they call
 * `revalidatePath` server-side and the new attachment shows on the next
 * `router.refresh()`. The image flow uploads out-of-band to the
 * `/api/posts/[id]/images` route handler, which does NOT revalidate — so
 * without this the freshly-attached image only appears after a full
 * reload. The client passes its current `usePathname()` here right after
 * the uploads finish, then calls `router.refresh()`.
 */
export async function revalidatePathAction(path: string): Promise<void> {
  revalidatePath(path);
}
