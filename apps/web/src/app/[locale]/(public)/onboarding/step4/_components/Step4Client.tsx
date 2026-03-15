'use client';

import { useCallback } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { Link } from '@/i18n/routing';

import type { Locale } from '@/app/[locale]/_lib/types';

import { OnboardingStepLayout } from '../../_components';

type Props = {
  locale: Locale;
};

export function Step4Client({ locale }: Props) {
  const router = useRouter();
  const t = useTranslations('onboarding');

  const handleBack = useCallback(() => {
    router.push(`/${locale}/onboarding/step3`);
  }, [router, locale]);

  const gameModes = [
    {
      href: '/games/new/standard',
      icon: '\u265F',
      titleKey: 'step4.gameModes.standard',
      descriptionKey: 'step4.gameModes.standardDescription',
    },
    {
      href: '/games/new/pgn',
      icon: '\u{1F4CB}',
      titleKey: 'step4.gameModes.pgn',
      descriptionKey: 'step4.gameModes.pgnDescription',
    },
    {
      href: '/games/new/position',
      icon: '\u265C',
      titleKey: 'step4.gameModes.position',
      descriptionKey: 'step4.gameModes.positionDescription',
    },
  ] as const;

  return (
    <OnboardingStepLayout currentStepIndex={3} onBack={handleBack}>
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-lg font-semibold text-foreground">{t('step4.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('step4.description')}</p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {gameModes.map((mode) => (
            <Link
              key={mode.href}
              href={mode.href}
              locale={locale}
              className="group block p-4 rounded-md border border-border transition-all hover:shadow-md hover:border-foreground/20"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">{mode.icon}</span>
                <div className="flex-1">
                  <h3 className="text-base font-medium text-foreground transition-colors">
                    {t(mode.titleKey)}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">{t(mode.descriptionKey)}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </OnboardingStepLayout>
  );
}
