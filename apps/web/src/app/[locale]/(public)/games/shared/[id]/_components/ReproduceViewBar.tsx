'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { Side } from '@blindfold-chess/types';

import type { GamePlaySettings } from '@/lib/games/saved-game-types';

import { type HelpStep, HelpTourButton } from '@/app/[locale]/_components/HelpTourButton';
import {
  toggleKnobClass,
  toggleTrackClass,
} from '@/app/[locale]/_components/toggle-switch-classes';

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
  playerColor: Side;
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
          <span aria-hidden className={toggleTrackClass('control', reproduceView)}>
            <span className={toggleKnobClass('control', reproduceView)} />
          </span>
        </button>
        <HelpTourButton steps={reproduceViewTourSteps} label={t('playSettings.tour.label')} />
      </div>
    </div>
  );
}
