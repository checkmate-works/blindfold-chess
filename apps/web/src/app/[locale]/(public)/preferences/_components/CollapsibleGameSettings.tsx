'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

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

  return (
    <div className="space-y-6">
      {/* Board visibility — 3-way picker. The primary choice that controls
          whether the rest of the visual settings are even relevant. */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-2">
          {tPrefs('game.boardVisibility')}
        </h4>
        <BoardVisibilityPicker
          value={settings.boardVisibility}
          onChange={(boardVisibility) => onSettingsChange({ boardVisibility })}
        />
      </div>

      {/* AI move display time — only relevant when the board is hidden (the chip
          is the only place the AI's reply surfaces); shown right under the
          board-visibility choice that gates it, indented like "Allow peeking"
          to read as a sub-setting of "Hide the board". */}
      {settings.boardVisibility !== 'always' && (
        <div className="border-l border-border pl-4">
          <AiReplyDurationPicker
            value={settings.aiReplyDuration}
            onChange={(aiReplyDuration) => onSettingsChange({ aiReplyDuration })}
          />
        </div>
      )}

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
