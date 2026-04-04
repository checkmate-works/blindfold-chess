'use client';

import { useEffect, useState } from 'react';

import { useSafeLocale as useLocale } from '@/i18n/use-safe-locale';

import { AnnouncementBanner } from './AnnouncementBanner';

type BannerData = {
  id: string;
  title: string;
  slug: string;
};

function getDismissedAnnouncementId(): string | undefined {
  const match = document.cookie.match(/(?:^|;\s*)dismissed-announcement=([^;]*)/);
  return match?.[1];
}

export function AnnouncementBannerContainer() {
  const locale = useLocale();
  const [banner, setBanner] = useState<BannerData | null>(null);

  useEffect(() => {
    fetch(`/api/banner-announcement?locale=${encodeURIComponent(locale)}`)
      .then((res) => {
        if (!res.ok) return;
        return res.json();
      })
      .then((data: { announcement: BannerData | null } | undefined) => {
        if (!data) return;
        if (!data.announcement) return;
        const dismissedId = getDismissedAnnouncementId();
        if (data.announcement.id !== dismissedId) {
          setBanner(data.announcement);
        }
      })
      .catch(() => {
        // Silently fail — banner is non-critical
      });
  }, [locale]);

  if (!banner) return null;

  return (
    <AnnouncementBanner
      id={banner.id}
      title={banner.title}
      href={`/${locale}/announcements/${banner.slug}`}
    />
  );
}
