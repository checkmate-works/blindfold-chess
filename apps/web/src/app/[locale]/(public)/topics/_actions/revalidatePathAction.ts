'use server';

import { revalidatePath } from 'next/cache';

import { authenticateAndGuard } from '@/lib/auth';
import { sanitizeNext } from '@/lib/safe-next';
import { RATE_LIMITS } from '@/lib/security/rate-limit';

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
 *
 * A Server Action is a public POST endpoint, so this guards against abuse:
 * without auth + rate limiting an anonymous caller could loop it with
 * arbitrary paths to force repeated SSR/DB regeneration of expensive routes
 * (cache-purge amplification). We require a signed-in, non-banned,
 * rate-limited caller and only accept a same-origin relative path (via
 * `sanitizeNext`); anything else is a silent no-op — the caller ignores the
 * return value and at worst the image appears on the next full reload.
 */
export async function revalidatePathAction(path: string): Promise<void> {
  const safePath = sanitizeNext(path);
  if (!safePath) return;

  const guard = await authenticateAndGuard(RATE_LIMITS.revalidateAttachmentPath);
  if ('error' in guard) return;

  revalidatePath(safePath);
}
