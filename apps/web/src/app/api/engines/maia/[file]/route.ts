import 'server-only';

import { getOptionalUser } from '@/lib/auth';
import { canUseMaia } from '@/lib/users/can-use-maia';

import { loadMaiaModel } from './_lib/load-maia-model';

/**
 * Auth-gated delivery of the Maia 3 ONNX model.
 *
 * The model file lives outside `public/` (under `apps/web/engines/maia/`)
 * so the bytes are only reachable through this handler. Every request
 * is gated by {@link canUseMaia}; unauthenticated callers — and users
 * with neither an active subscription nor a paid Maia game — receive 403.
 *
 * Threat model:
 *   - Anonymous attackers cannot trigger the 46 MB egress at all — the
 *     handler short-circuits with 403 before touching the disk.
 *   - Authenticated abusers are still possible (an entitled user can
 *     loop downloads), but `Cache-Control: private, immutable` lets
 *     the browser cache and means honest clients only fetch once per
 *     browser per model version.
 *   - Per-user / per-IP throttling is intentionally NOT layered here
 *     yet; we wait for observed abuse before adding it.
 *
 * Why a Buffer (not a stream): the file is ~46 MB which fits comfortably
 * in a Vercel Function's default 1 GB memory budget. Buffering keeps
 * the implementation small; switch to a stream if memory pressure ever
 * becomes a concern.
 *
 * Why `private` (not `public`) Cache-Control: the response is per-user
 * (a future revocation must not be served from a shared CDN copy). The
 * `immutable` directive still lets the browser skip revalidation.
 */

const ALLOWED_FILES = new Set(['maia3_simplified.onnx']);

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;

  if (!ALLOWED_FILES.has(file)) {
    return new Response('Not Found', { status: 404 });
  }

  const user = await getOptionalUser();
  const allowed = await canUseMaia(user?.id ?? null);
  if (!allowed) {
    return new Response('Forbidden', { status: 403 });
  }

  const buffer = await loadMaiaModel(file);
  if (!buffer) {
    return new Response('Not Found', { status: 404 });
  }

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Length': buffer.length.toString(),
      'Cache-Control': 'private, max-age=31536000, immutable',
    },
  });
}
