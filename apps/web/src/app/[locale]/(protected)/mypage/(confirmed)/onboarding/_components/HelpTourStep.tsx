'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { type HelpStep, HelpTourButton } from '@/app/[locale]/_components/HelpTourButton';

import { StepHeading } from './StepHeading';

/**
 * Step 3 — teaches the help-tour affordance with a live, miniature replica of
 * a real page: the grey title band (`bg-secondary`, the `<main>` background
 * every `PageLayout` title sits on) holding a real page name and the actual
 * `HelpTourButton`, over a `bg-card` strip standing in for the page panel.
 * Tapping the `?` fires a real driver.js popover over the replica, so the
 * member tries the feature rather than reading about it.
 *
 * @design A replica, not a screenshot
 * The earlier version framed "Sample screen" in a plain bordered box that
 * looked like no screen in the app, so members could not tell where the `?`
 * would appear. A screenshot would fix that but needs one image per locale
 * and theme (eight), goes stale silently whenever the header changes, and
 * cannot be tapped. Built from the same tokens and type scale as the real
 * header, the replica follows the locale, the theme and future header changes
 * on its own. The title is set in `PageTitle`'s classes rather than through
 * `PageTitle` itself, which renders an `<h1>` — this page already has one.
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
      <StepHeading>{t('helpTour.title')}</StepHeading>

      <div className="overflow-hidden rounded-lg border border-border">
        <div
          data-tour-id={DEMO_TARGET_ID}
          className="flex items-center justify-center gap-2 bg-secondary px-4 py-6"
        >
          <p className="text-xl font-light text-foreground md:text-2xl">
            {t('helpTour.demoTitle')}
          </p>
          {/* The ring marks the one thing to press; the button inside is real. */}
          <span className="inline-flex rounded-full ring-2 ring-primary ring-offset-2 ring-offset-secondary">
            <HelpTourButton steps={demoSteps} label={t('helpTour.label')} />
          </span>
        </div>
        <div aria-hidden className="space-y-2 bg-card p-4">
          <div className="h-2.5 w-3/4 rounded bg-muted" />
          <div className="h-2.5 w-1/2 rounded bg-muted" />
        </div>
      </div>

      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>{t('helpTour.demoHint')}</li>
        <li>{t('helpTour.note')}</li>
      </ul>
    </div>
  );
}
