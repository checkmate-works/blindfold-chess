'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { type HelpStep, HelpTourButton } from '@/app/[locale]/_components/HelpTourButton';

/**
 * The page-title help tour for a shared game — the established home for a
 * tour, next to the title. Walks through the two affordances that are easy to
 * misread: the "As played" board toggle and the "Create from this position"
 * menu. Each step highlights its control when on screen; when it isn't (the
 * create menu only appears on a move, not the opening board), the step shows a
 * centered popover so the feature is still explained.
 */
export function GameHelpTour() {
  const t = useTranslations('sharedGames');

  const steps: HelpStep[] = [
    {
      targetId: 'replay-reproduce-view',
      title: t('playSettings.tour.reproduceView.title'),
      description: t('playSettings.tour.reproduceView.description'),
      side: 'top',
      align: 'end',
    },
    {
      targetId: 'game-create-from-position',
      title: t('tour.createFromPosition.title'),
      description: t('tour.createFromPosition.description'),
      side: 'bottom',
      align: 'start',
    },
  ];

  return <HelpTourButton steps={steps} label={t('tour.label')} />;
}
