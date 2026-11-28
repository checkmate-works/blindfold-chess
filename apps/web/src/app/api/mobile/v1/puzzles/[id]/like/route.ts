import { getLikeMeta } from '@/lib/db/like-queries';
import { authorizeLiker, likeToggleResponse, readLikeViewer } from '@/lib/mobile-api/likes';
import { isMobilePuzzle } from '@/lib/mobile-api/puzzles';
import {
  mobileError,
  mobileJson,
  mobilePreflight,
  withMobileErrors,
} from '@/lib/mobile-api/response';
import { POSITION_LIKE_TARGET, togglePositionLikeForUser } from '@/lib/positions/like-actions';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

/**
 * `{ liked, likeCount }` for a featured puzzle. Signed out, `liked` is false.
 * Only the puzzles the app offers answer: any other id is 404, so the route
 * cannot be used to read or write likes on the user-submitted pool.
 */
export async function GET(request: Request, { params }: Params) {
  return withMobileErrors('puzzles/[id]/like', async () => {
    const { id } = await params;
    const viewer = await readLikeViewer(request);
    if (!viewer.ok) return viewer.response;
    if (!(await isMobilePuzzle(id))) return mobileError('notFound', 404);
    const meta = await getLikeMeta(POSITION_LIKE_TARGET, id, viewer.userId);
    return mobileJson({ liked: meta.likedByMe, likeCount: meta.likeCount });
  });
}

/** Toggles the signed-in user's like — the web's puzzle `toggleLike`. */
export async function POST(request: Request, { params }: Params) {
  return withMobileErrors('puzzles/[id]/like', async () => {
    const { id } = await params;
    const liker = await authorizeLiker(request);
    if (!liker.ok) return liker.response;
    if (!(await isMobilePuzzle(id))) return mobileError('notFound', 404);
    return likeToggleResponse(await togglePositionLikeForUser(liker.userId, id));
  });
}

export const OPTIONS = mobilePreflight;
