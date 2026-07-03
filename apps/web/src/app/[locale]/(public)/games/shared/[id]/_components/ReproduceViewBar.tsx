'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { GamePlaySettings } from '@/lib/games/saved-game-types';

import { type HelpStep, HelpTourButton } from '@/app/[locale]/_components/HelpTourButton';

import { PlaySettingsIndicator } from './PlaySettingsIndicator';

/**
 * How this game was played, at the position currently on the board. Sits
 * directly under the board and updates as the viewer steps through the
 * moves. The switch on the right reproduces the player's view (piece
 * obfuscation) on the board itself, with a one-step help tour explaining it.
 */
export function ReproduceViewBar({
  settings,
  playerColor,
  reproduceView,
  onToggle,
}: {
  settings: GamePlaySettings;
  playerColor: 'white' | 'black';
  reproduceView: boolean;
  onToggle: () => void;
}) {
  const t = useTranslations('sharedGames');

  const reproduceViewTourSteps: HelpStep[] = [
    {
      targetId: 'replay-reproduce-view',
      title: t('playSettings.tour.reproduceView.title'),
      description: t('playSettings.tour.reproduceView.description'),
      side: 'top',
      align: 'end',
    },
  ];

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <PlaySettingsIndicator settings={settings} playerColor={playerColor} />
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          role="switch"
          data-tour-id="replay-reproduce-view"
          aria-checked={reproduceView}
          onClick={onToggle}
          className="inline-flex shrink-0 items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <span>{t('playSettings.reproduceView')}</span>
          <span
            aria-hidden
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              reproduceView ? 'bg-foreground' : 'bg-secondary'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                reproduceView ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </span>
        </button>
        <HelpTourButton steps={reproduceViewTourSteps} label={t('playSettings.tour.label')} />
      </div>
    </div>
  );
}
