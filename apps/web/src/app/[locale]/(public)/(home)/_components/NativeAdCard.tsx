'use client';

import Image from 'next/image';

import type { AdBannerConfig } from '@/lib/ad';

import { UserAvatar } from '@/app/[locale]/(public)/topics/_components/UserAvatar';

type Props = {
  ad: AdBannerConfig;
  adLabel: string;
  sponsorLabel: string;
  sponsoredLinkLabel: string;
  locale: string;
};

export function NativeAdCard({ ad, adLabel, sponsorLabel, sponsoredLinkLabel, locale }: Props) {
  return (
    <a
      href={ad.href}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="flex gap-4 p-4 hover:bg-muted/50 transition-colors"
    >
      <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-lg overflow-hidden">
        <Image
          src={ad.imagePath}
          alt={ad.alt}
          width={ad.width}
          height={ad.height}
          className="w-full h-full object-cover"
          unoptimized
        />
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-1">
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
      </div>
    </a>
  );
}
