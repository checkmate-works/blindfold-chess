'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { type HelpStep, HelpTourButton } from '@/app/[locale]/_components/HelpTourButton';
import type { PerGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { AiReplyDurationPicker } from './AiReplyDurationPicker';
import { BoardVisibilityPicker } from './BoardVisibilityPicker';
import { GameSettingsContent } from './GameSettingsContent';

type Props = {
  settings: PerGamePreferences;
  onSettingsChange: (updates: Partial<PerGamePreferences>) => void;
};

/**
 * Board-settings block shared by the new-game forms (standard / pgn / position)
 * and the global Preferences "Game" tab, so the two surfaces stay in lockstep.
 * Rendered flat (no card chrome / dividers) to match the surrounding flat
 * selectors (ColorSelector etc.). The board-visibility picker (and the peek-mode
 * picker it gates) sit on top; the detailed visual settings render inline below
 * it whenever there is a board to configure (`boardVisibility !== 'never'`, i.e.
 * "Hide the board" off OR "Allow peeking" on). They are hidden only for the pure
 * blindfold ('never') mode, where there is nothing visual to tweak.
 */
export function CollapsibleGameSettings({ settings, onSettingsChange }: Props) {
  const tPrefs = useTranslations('Preferences');
  const { preferences } = useGamePreferences();

  // Bridge PerGamePreferences to full GamePreferences for GameSettingsContent
  const settingsForContent = {
    ...preferences,
    ...settings,
  };

  // On-demand `?` walkthrough of the blindfold settings (driver.js via
  // HelpTourButton). Steps target the `data-tour-id`s on each group — the board-
  // visibility picker here plus the appearance groups inside GameSettingsContent
  // (a global attribute, so a single tour spans both). The appearance steps are
  // included only when those controls are actually rendered (`!== 'never'`). Not
  // shown in the mid-game modal, which renders GameSettingsContent directly
  // (without this wrapper) — a tour overlay inside a modal would be awkward.
  const tourSteps: HelpStep[] = [
    {
      targetId: 'settings-board-visibility',
      title: tPrefs('game.tour.boardVisibility.title'),
      description: tPrefs('game.tour.boardVisibility.text'),
    },
  ];
  if (settings.boardVisibility !== 'never') {
    tourSteps.push(
      {
        targetId: 'settings-piece-visibility',
        title: tPrefs('game.tour.pieceVisibility.title'),
        description: tPrefs('game.tour.pieceVisibility.text'),
      },
      {
        targetId: 'settings-stones',
        title: tPrefs('game.tour.stones.title'),
        description: tPrefs('game.tour.stones.text'),
      },
      {
        targetId: 'settings-piece-color',
        title: tPrefs('game.tour.pieceColor.title'),
        description: tPrefs('game.tour.pieceColor.text'),
      },
      {
        targetId: 'settings-pawn-hide',
        title: tPrefs('game.tour.pawnHide.title'),
        description: tPrefs('game.tour.pawnHide.text'),
      },
      {
        targetId: 'settings-preview',
        title: tPrefs('game.tour.preview.title'),
        description: tPrefs('game.tour.preview.text'),
      }
    );
  }

  return (
    <div className="space-y-6">
      {/* On-demand guide to the blindfold settings. */}
      <div className="flex justify-end">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          {tPrefs('game.tour.label')}
          <HelpTourButton steps={tourSteps} label={tPrefs('game.tour.label')} />
        </span>
      </div>

      {/* Board visibility — 3-way picker. The primary choice that controls
          whether the rest of the visual settings are even relevant. */}
      <div data-tour-id="settings-board-visibility">
        <h4 className="text-sm font-semibold text-foreground mb-2">
          {tPrefs('game.boardVisibility')}
        </h4>
        <BoardVisibilityPicker
          value={settings.boardVisibility}
          onChange={(boardVisibility) => onSettingsChange({ boardVisibility })}
          // AI move display time rides inside the blindfold group, right under
          // "Allow peeking", as another board-hidden-only sub-setting.
          blindfoldExtra={
            <AiReplyDurationPicker
              value={settings.aiReplyDuration}
              onChange={(aiReplyDuration) => onSettingsChange({ aiReplyDuration })}
            />
          }
        />
      </div>

      {settings.boardVisibility !== 'never' && (
        <GameSettingsContent
          settings={settingsForContent}
          onSettingsChange={onSettingsChange}
          showBoardButtonOption={false}
          showBoardAppearance={false}
          showPreview={true}
          compact={true}
        />
      )}
    </div>
  );
}
