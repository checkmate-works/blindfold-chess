import type { NextResponse } from 'next/server';

import 'server-only';

import { userHasProfile } from '@/lib/auth';
import { RATE_LIMITS } from '@/lib/security/rate-limit';

import { authorizeMobileRequest, readBearerToken } from './auth';
import { mobileError, mobileJson } from './response';

/**
 * Likes in the app: the heart on a featured puzzle's result and on a public
 * announcement. Only the viewer's own state and the total go over the wire —
 * never who liked — so the app still shows no other user (apps/mobile/CLAUDE.md).
 */
export type MobileLikeState = { liked: boolean; likeCount: number };

type Viewer = { ok: true; userId: string | undefined } | { ok: false; response: NextResponse };

/**
 * The reader of a like's state. Signed out (no token) is a valid answer, the
 * count alone; a token the Auth server rejects is a 401, so the app finds out
 * its session is gone rather than seeing every heart as unliked.
 */
export async function readLikeViewer(request: Request): Promise<Viewer> {
  if (!readBearerToken(request)) return { ok: true, userId: undefined };
  const auth = await authorizeMobileRequest(request, { allowBanned: true });
  return auth.ok ? { ok: true, userId: auth.user.id } : auth;
}

/**
 * The web's like guard (`authenticateGuardAndRequireProfile` with
 * `toggleLike`'s rate limit), for a bearer token. A signed-in user who has not
 * picked a username yet gets 403 `profileRequired`, as on the web: a like
 * names its liker in the owner's notification.
 */
export async function authorizeLiker(
  request: Request
): Promise<{ ok: true; userId: string } | { ok: false; response: NextResponse }> {
  const auth = await authorizeMobileRequest(request, { rateLimit: RATE_LIMITS.toggleLike });
  if (!auth.ok) return auth;
  if (!(await userHasProfile(auth.user.id))) {
    return { ok: false, response: mobileError('profileRequired', 403) };
  }
  return { ok: true, userId: auth.user.id };
}

/** A toggle's outcome as the app reads it. */
export function likeToggleResponse(result: MobileLikeState | { error: string }): NextResponse {
  if ('error' in result) {
    return mobileError(result.error, result.error === 'notFound' ? 404 : 403);
  }
  return mobileJson({ liked: result.liked, likeCount: result.likeCount });
}
