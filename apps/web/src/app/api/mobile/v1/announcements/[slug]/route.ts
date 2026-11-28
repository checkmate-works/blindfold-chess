import { getMobileAnnouncement, mobileAnnouncementLocale } from '@/lib/mobile-api/announcements';
import {
  mobileError,
  mobileJson,
  mobilePreflight,
  withMobileErrors,
} from '@/lib/mobile-api/response';

export const dynamic = 'force-dynamic';

/**
 * One public announcement with its markdown body (`?locale=` the app's
 * language). 404 for a slug with no public published row: a draft, a
 * members-only one, or one taken down after the app read the list.
 */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  return withMobileErrors('announcements/[slug]', async () => {
    const { slug } = await params;
    const locale = mobileAnnouncementLocale(new URL(request.url).searchParams.get('locale'));
    const announcement = await getMobileAnnouncement(slug, locale);
    return announcement ? mobileJson(announcement) : mobileError('notFound', 404);
  });
}

export const OPTIONS = mobilePreflight;
