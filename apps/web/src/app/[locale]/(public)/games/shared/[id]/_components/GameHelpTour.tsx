'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { type HelpStep, HelpTourButton } from '@/app/[locale]/_components/HelpTourButton';

/**
 * The page-title help tour for a shared game — the established home for a
 * tour, next to the title. Walks through the two affordances that are easy to
 * misread: the "As played" board toggle and the "Create from this position"
 * menu. HelpTourButton skips any step whose control isn't on screen, so on the
 * opening board (where the create menu doesn't exist) the tour covers just the
 * "As played" toggle; stepping to a move adds the create-menu step.
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
