'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { CertificateFrame } from '@/app/[locale]/_components/CertificateFrame';

type Props = {
  displayName: string;
  skillLevel: number;
};

export function VictoryCertificate({ displayName, skillLevel }: Props) {
  const t = useTranslations('play');

  return (
    <CertificateFrame>
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
    </CertificateFrame>
  );
}
