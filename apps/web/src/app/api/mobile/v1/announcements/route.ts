import {
  listMobileAnnouncements,
  mobileAnnouncementLocale,
  mobileAnnouncementPageNumber,
} from '@/lib/mobile-api/announcements';
import { mobileJson, mobilePreflight, withMobileErrors } from '@/lib/mobile-api/response';

export const dynamic = 'force-dynamic';

/**
 * One page of the public announcements, pinned first then newest first
 * (`?page=` 1-based, `?locale=` the app's language). Public: no sign-in
 * needed, and a signed-in reader gets the same list.
 */
export async function GET(request: Request) {
  return withMobileErrors('announcements', async () => {
    const { searchParams } = new URL(request.url);
    return mobileJson(
      await listMobileAnnouncements(
        mobileAnnouncementLocale(searchParams.get('locale')),
        mobileAnnouncementPageNumber(searchParams.get('page'))
      )
    );
  });
}

export const OPTIONS = mobilePreflight;
