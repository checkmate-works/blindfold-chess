'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { HelpTourButton } from '@/app/[locale]/_components';
import type { HelpStep } from '@/app/[locale]/_components';
import { TEXT_LINK_CLASSES } from '@/app/[locale]/_lib/link-classes';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  locale: Locale;
  /** Whether the settings gear is shown (per-game editing available). */
  hasSettingsGear: boolean;
  /**
   * Whether the input-mode switch icon is shown (≥2 input modes enabled). When
   * only one mode is enabled the icon isn't rendered, so its tour step is
   * omitted too — otherwise driver.js would have no element to highlight.
   */
  hasInputModeSwitch: boolean;
};

/**
 * "?" help-tour trigger shown next to the play page title. Walks the player
 * through the two on-page controls that are easy to miss: the settings gear and
 * the input-mode switch. Each step is included only when its target is actually
 * on screen; with neither present, {@link HelpTourButton} renders nothing.
 */
export function PlayHelpTour({ locale, hasSettingsGear, hasInputModeSwitch }: Props) {
  const t = useTranslations('play');

  const steps: HelpStep[] = [];

  if (hasSettingsGear) {
    steps.push({
      targetId: 'play-settings-gear',
      title: t('help.settings.title'),
      description: t('help.settings.description'),
      side: 'bottom',
      align: 'end',
    });
  }

  if (hasInputModeSwitch) {
    const controlsHref = `/${locale}/preferences?tab=controls`;
    steps.push({
      targetId: 'play-input-mode',
      title: t('help.inputMode.title'),
      description:
        t('help.inputMode.description') +
        `<br /><br /><a href="${controlsHref}" class="${TEXT_LINK_CLASSES}">${t('help.inputMode.link')}</a>`,
      side: 'top',
      align: 'end',
    });
  }

  return <HelpTourButton steps={steps} label={t('help.label')} />;
}
