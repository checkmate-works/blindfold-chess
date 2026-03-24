/**
 * Native ad card that blends with organic feed cards.
 *
 * Uses the same layout (image left, text right) and UserAvatar as other
 * feed cards so the ad integrates visually. The timestamp slot shows
 * "Sponsored Link" instead of a time value (same pattern as X/Twitter
 * promoted posts). Sponsor identity is currently a hardcoded i18n label
 * (案C); can be migrated to a dedicated advertiser table if needed.
 */
'use client';

import Image from 'next/image';

import type { AdBannerConfig } from '@/lib/ad';

import { UserAvatar } from '@/app/[locale]/(public)/topics/_components/UserAvatar';

import { FeedItemCard } from './FeedItemCard';

type Props = {
  ad: AdBannerConfig;
  adLabel: string;
  sponsorLabel: string;
  sponsoredLinkLabel: string;
  locale: string;
};

export function NativeAdCard({ ad, adLabel, sponsorLabel, sponsoredLinkLabel, locale }: Props) {
  return (
    <FeedItemCard
      href={ad.href}
      external
      thumbnail={
        <Image
          src={ad.imagePath}
          alt={ad.alt}
          width={ad.width}
          height={ad.height}
          className="w-full h-full object-cover"
          unoptimized
        />
      }
      thumbnailClassName="rounded-lg overflow-hidden"
    >
      <UserAvatar
        profileHref={null}
        avatarUrl={null}
        displayName={sponsorLabel}
        locale={locale}
        size="sm"
        flair={null}
        country={null}
      />
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{sponsoredLinkLabel}</span>
      </div>
      <span className="inline-flex items-center self-start px-1.5 py-0.5 rounded text-xs font-semibold bg-muted text-muted-foreground">
        {adLabel}
      </span>
      <p className="text-sm text-foreground mt-1">{ad.alt}</p>
    </FeedItemCard>
  );
}
