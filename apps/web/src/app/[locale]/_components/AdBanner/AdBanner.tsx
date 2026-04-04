'use client';

import { useEffect, useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { AdBannerConfig } from '@/lib/ad';

type AdBannerProps = {
  slot: string;
};

export function AdBanner({ slot }: AdBannerProps) {
  const t = useTranslations('Common');
  const [config, setConfig] = useState<AdBannerConfig | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchBanner() {
      try {
        const res = await fetch(`/api/ad-banners?slot=${encodeURIComponent(slot)}`);
        if (!res.ok) return;

        const json = (await res.json()) as { data: AdBannerConfig | null };
        if (!cancelled && json.data) {
          setConfig(json.data);
        }
      } catch {
        // Silently fail - ads are non-critical
      }
    }

    fetchBanner();

    return () => {
      cancelled = true;
    };
  }, [slot]);

  if (!config) return null;

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
