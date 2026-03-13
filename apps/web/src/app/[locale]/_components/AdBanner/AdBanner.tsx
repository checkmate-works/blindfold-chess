import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import Link from 'next/link';

import { getAdBannerBySlot, isAdsEnabled } from '@/lib/ad';

import type { Locale } from '@/app/[locale]/_lib/types';

type AdBannerProps = {
  slot: string;
  locale: Locale;
};

export async function AdBanner({ slot, locale }: AdBannerProps) {
  const enabled = await isAdsEnabled();
  if (!enabled) return null;

  const config = await getAdBannerBySlot(slot);
  if (!config) return null;

  const t = await getTranslations({ locale, namespace: 'Common' });
  const isWide = slot.includes('wide');

  return (
    <div className={`mx-auto ${isWide ? 'max-w-[960px] sm:max-w-[670px]' : 'max-w-[300px]'}`}>
      <p className="mb-1 text-xs text-muted-foreground">{t('adLabel')}</p>
      <Link
        href={config.href}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="block overflow-hidden rounded-lg transition-opacity hover:opacity-80"
      >
        <Image
          src={config.imagePath}
          alt={config.alt}
          width={config.width}
          height={config.height}
          className="h-auto w-full"
        />
      </Link>
    </div>
  );
}
