'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { type HelpStep, HelpTourButton } from '@/app/[locale]/_components/HelpTourButton';
import { PageTitle } from '@/app/[locale]/_components/PageTitle';

/**
 * Step 2 — teaches the help-tour affordance. Instead of a static illustration,
 * this renders a live replica of a real page header (a `PageTitle` paired with
 * the actual `HelpTourButton`). Tapping the `?` fires a real driver.js popover
 * over the mock header, so the user experiences the feature first-hand. The
 * tour target lives on this same element, so it works without a route change.
 */
const DEMO_TARGET_ID = 'onboarding-help-demo';

export function HelpTourStep() {
  const t = useTranslations('onboardingWizard');

  const demoSteps: HelpStep[] = [
    {
      targetId: DEMO_TARGET_ID,
      title: t('helpTour.demoTourTitle'),
      description: t('helpTour.demoTourText'),
      side: 'bottom',
      align: 'center',
    },
  ];

  return (
    <div className="space-y-6">
      <p className="text-center font-medium text-foreground">{t('helpTour.title')}</p>

      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <div data-tour-id={DEMO_TARGET_ID} className="flex items-center justify-center gap-2">
          <PageTitle>{t('helpTour.demoTitle')}</PageTitle>
          <HelpTourButton steps={demoSteps} label={t('helpTour.label')} />
        </div>
      </div>

      <p className="text-sm text-foreground">{t('helpTour.demoHint')}</p>
      <p className="text-xs text-muted-foreground">{t('helpTour.note')}</p>
    </div>
  );
}
