'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { EngineConfig } from '@/lib/engines';

import { CertificateFrame } from '@/app/[locale]/_components/CertificateFrame';

type Props = {
  displayName: string;
  engineConfig: EngineConfig;
};

export function VictoryCertificate({ displayName, engineConfig }: Props) {
  const t = useTranslations('play');

  // Branch on the discriminator so the body text correctly names the
  // engine that was defeated. New engines plug in via a new i18n key
  // and a matching `kind` branch here.
  const bodyText =
    engineConfig.kind === 'maia'
      ? t('certificate.bodyMaia', { rating: engineConfig.rating })
      : t('certificate.body', { level: engineConfig.skillLevel });

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
        {bodyText}
      </p>
    </CertificateFrame>
  );
}
