import { NextResponse } from 'next/server';

import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@/config';

import { getLatestBannerAnnouncement } from '@/app/[locale]/(public)/announcements/_lib/queries';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawLocale = searchParams.get('locale') || DEFAULT_LOCALE;
  const locale = (SUPPORTED_LOCALES as readonly string[]).includes(rawLocale)
    ? rawLocale
    : DEFAULT_LOCALE;

  const announcement = await getLatestBannerAnnouncement(locale);

  if (!announcement) {
    return NextResponse.json({ announcement: null });
  }

  return NextResponse.json({
    announcement: {
      id: announcement.id,
      title: announcement.title,
      slug: announcement.slug,
    },
  });
}
