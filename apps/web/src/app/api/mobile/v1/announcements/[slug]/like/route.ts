import {
  ANNOUNCEMENT_LIKE_TARGET,
  getAnnouncementLikeMeta,
  toggleAnnouncementLike,
} from '@/lib/db/announcement-likes';
import {
  getMobileAnnouncementVariantId,
  mobileAnnouncementLocale,
} from '@/lib/mobile-api/announcements';
import { authorizeLiker, likeToggleResponse, readLikeViewer } from '@/lib/mobile-api/likes';
import {
  mobileError,
  mobileJson,
  mobilePreflight,
  withMobileErrors,
} from '@/lib/mobile-api/response';
import { logActivityEvent } from '@/lib/users/activity-log';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ slug: string }> };

/**
 * `{ liked, likeCount }` for a public announcement, counted across its
 * locales as on the web. Signed out, `liked` is false. 404 for a slug the app
 * would not show (a draft or a members-only one).
 */
export async function GET(request: Request, { params }: Params) {
  return withMobileErrors('announcements/[slug]/like', async () => {
    const { slug } = await params;
    const viewer = await readLikeViewer(request);
    if (!viewer.ok) return viewer.response;
    const locale = mobileAnnouncementLocale(new URL(request.url).searchParams.get('locale'));
    if (!(await getMobileAnnouncementVariantId(slug, locale))) {
      return mobileError('notFound', 404);
    }
    const meta = await getAnnouncementLikeMeta(slug, viewer.userId);
    return mobileJson({ liked: meta.likedByMe, likeCount: meta.likeCount });
  });
}

/**
 * Toggles the signed-in user's like (`?locale=` the app's language, which
 * picks the variant the like is written against) — the web's
 * `toggleAnnouncementLikeAction`. Nobody is notified.
 */
export async function POST(request: Request, { params }: Params) {
  return withMobileErrors('announcements/[slug]/like', async () => {
    const { slug } = await params;
    const liker = await authorizeLiker(request);
    if (!liker.ok) return liker.response;
    const locale = mobileAnnouncementLocale(new URL(request.url).searchParams.get('locale'));
    const variantId = await getMobileAnnouncementVariantId(slug, locale);
    if (!variantId) return mobileError('notFound', 404);
    const result = await toggleAnnouncementLike({
      userId: liker.userId,
      slug,
      displayedVariantId: variantId,
    });
    if (!('error' in result)) {
      logActivityEvent({
        userId: liker.userId,
        action: result.liked ? 'like' : 'unlike',
        targetType: ANNOUNCEMENT_LIKE_TARGET,
        targetId: variantId,
      });
    }
    return likeToggleResponse(result);
  });
}

export const OPTIONS = mobilePreflight;
