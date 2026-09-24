'use client';

import { useId, useState } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaChevronDown } from 'react-icons/fa';

import {
  DIFFICULTY_PRESETS,
  type DifficultyLevel,
  matchDifficultyPreset,
} from '@/app/[locale]/(public)/preferences/_lib/difficulty-presets';
import { type HelpStep, HelpTourButton } from '@/app/[locale]/_components/HelpTourButton';
import type { PerGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { AiReplyDurationPicker } from './AiReplyDurationPicker';
import { BoardPreview } from './BoardPreview';
import { BoardVisibilityPicker } from './BoardVisibilityPicker';
import { DifficultyPresetPicker } from './DifficultyPresetPicker';
import { GameSettingsContent } from './GameSettingsContent';

type Props = {
  settings: PerGamePreferences;
  onSettingsChange: (updates: Partial<PerGamePreferences>) => void;
};

/**
 * Board-settings block shared by the new-game forms (standard / pgn / position)
 * and the global Preferences "Game" tab, so the two surfaces stay in lockstep.
 * Rendered flat (no card chrome / dividers) to match the surrounding flat
 * selectors (ColorSelector etc.).
 *
 * Top to bottom:
 *
 * 1. The difficulty ladder (see `difficulty-presets.ts`). Picking a level
 *    writes its values into the ordinary settings; the highlighted level is
 *    re-derived from those settings on every render, so hand edits below that
 *    leave the ladder show up as "Custom".
 * 2. A "Customize" expander holding the detailed controls: the
 *    board-visibility toggles (and the peek / AI-reply sub-settings they gate),
 *    then — whenever there is a board to configure (`boardVisibility !==
 *    'never'`) — the piece-appearance and display options.
 * 3. The live preview, kept outside the expander so a preset's effect is
 *    visible without opening it. Hidden for the pure blindfold ('never') mode,
 *    where there is nothing visual to show.
 *
 * The expander starts closed, since most players only need the ladder, but
 * opens by itself the first time the settings read as Custom — otherwise the
 * controls that make them Custom would be hidden behind a closed section. It
 * only ever opens itself once, so a player who edits their way back onto a
 * level does not see the section snap shut under the pointer, and one who
 * closes it keeps it closed.
 *
 * The mid-game settings modal renders `GameSettingsContent` directly, without
 * this wrapper, so it has neither the ladder nor the tour.
 */
export function CollapsibleGameSettings({ settings, onSettingsChange }: Props) {
  const tPrefs = useTranslations('Preferences');
  const { preferences } = useGamePreferences();
  const customizeId = useId();

  // Bridge PerGamePreferences to full GamePreferences for GameSettingsContent
  const settingsForContent = {
    ...preferences,
    ...settings,
  };

  const activeLevel = matchDifficultyPreset(settings);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [openedForCustom, setOpenedForCustom] = useState(false);
  // Render-phase adjustment rather than an effect, so the section is already
  // open on the first frame that shows "Custom".
  if (activeLevel === null && !openedForCustom) {
    setOpenedForCustom(true);
    setCustomizeOpen(true);
  }

  const applyPreset = (level: DifficultyLevel) => onSettingsChange(DIFFICULTY_PRESETS[level]);

  // On-demand `?` walkthrough of the blindfold settings (driver.js via
  // HelpTourButton). Steps target `data-tour-id`s — the ladder and expander
  // here, the board-visibility picker, the appearance groups inside
  // GameSettingsContent (a global attribute, so a single tour spans both) and
  // the preview. Starting the tour opens the expander so its controls can be
  // walked through; the appearance and preview steps are included only when
  // those are rendered at all (`!== 'never'`).
  const tourSteps: HelpStep[] = [
    {
      targetId: 'settings-difficulty',
      title: tPrefs('game.tour.preset.title'),
      description: tPrefs('game.tour.preset.text'),
    },
    {
      targetId: 'settings-customize',
      title: tPrefs('game.tour.customize.title'),
      description: tPrefs('game.tour.customize.text'),
    },
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
          <HelpTourButton
            steps={tourSteps}
            label={tPrefs('game.tour.label')}
            onBeforeStart={() => setCustomizeOpen(true)}
          />
        </span>
      </div>

      {/* Difficulty ladder — the primary choice for most players. */}
      <div data-tour-id="settings-difficulty">
        <h4 className="text-sm font-semibold text-foreground mb-2">
          {tPrefs('game.difficulty.title')}
        </h4>
        <DifficultyPresetPicker value={activeLevel} onSelect={applyPreset} />
      </div>

      <div>
        <button
          type="button"
          data-tour-id="settings-customize"
          aria-expanded={customizeOpen}
          aria-controls={customizeId}
          onClick={() => setCustomizeOpen((open) => !open)}
          className="flex w-full items-center justify-between gap-3 text-sm font-semibold text-foreground"
        >
          {tPrefs('game.difficulty.customize')}
          <FaChevronDown
            aria-hidden
            className={`h-3 w-3 text-muted-foreground transition-transform ${
              customizeOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {customizeOpen && (
          <div id={customizeId} className="mt-4 space-y-6 border-l border-border pl-4">
            {/* Board visibility — the choice that controls whether the rest of
                the visual settings are even relevant. */}
            <div data-tour-id="settings-board-visibility">
              <h4 className="text-sm font-semibold text-foreground mb-2">
                {tPrefs('game.boardVisibility')}
              </h4>
              <BoardVisibilityPicker
                value={settings.boardVisibility}
                onChange={(boardVisibility) => onSettingsChange({ boardVisibility })}
                // AI move display time rides inside the blindfold group, right
                // under "Allow peeking", as another board-hidden-only sub-setting.
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
                showPreview={false}
                compact={true}
              />
            )}
          </div>
        )}
      </div>

      {settings.boardVisibility !== 'never' && (
        <div data-tour-id="settings-preview">
          <BoardPreview settings={settingsForContent} />
        </div>
      )}
    </div>
  );
}
