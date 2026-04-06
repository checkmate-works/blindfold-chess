'use client';

import Image from 'next/image';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

type Props = {
  displayName: string;
  skillLevel: number;
};

export function VictoryCertificate({ displayName, skillLevel }: Props) {
  const t = useTranslations('play');

  return (
    <div className="relative w-full" style={{ aspectRatio: '3 / 2' }}>
      <Image
        src="/images/certificate-frame.webp"
        alt=""
        width={768}
        height={512}
        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        priority
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center px-[18%] py-[22%]">
        {/* Title */}
        <h3 className="text-base sm:text-xl font-serif font-bold text-podium-gold-foreground tracking-widest mb-4 sm:mb-6">
          {t('certificate.title')}
        </h3>

        {/* Name - right aligned */}
        <p className="text-sm text-podium-gold-foreground self-end mb-3 sm:mb-5">
          {t('certificate.honorific', { name: displayName })}
        </p>

        {/* Body */}
        <p className="text-xs sm:text-sm text-podium-gold-foreground text-center leading-relaxed sm:leading-loose">
          {t('certificate.body', { level: skillLevel })}
        </p>
      </div>
    </div>
  );
}
