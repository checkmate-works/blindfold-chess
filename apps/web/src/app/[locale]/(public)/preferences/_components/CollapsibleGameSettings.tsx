'use client';

import { useState } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaChevronDown } from 'react-icons/fa';

import type { PerGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { BoardVisibilityPicker } from './BoardVisibilityPicker';
import { GameSettingsContent } from './GameSettingsContent';
import { PeekModePicker } from './PeekModePicker';

type Props = {
  settings: PerGamePreferences;
  onSettingsChange: (updates: Partial<PerGamePreferences>) => void;
};

/**
 * Board-settings block shared by the new-game forms (standard / pgn / position)
 * and the global Preferences "Game" tab, so the two surfaces stay in lockstep.
 * Rendered flat (no card chrome / dividers) to match the surrounding flat
 * selectors (ColorSelector etc.). The board-visibility picker (and the peek-mode
 * picker it gates) sit above the fold; the detailed visual settings collapse
 * below it.
 */
export function CollapsibleGameSettings({ settings, onSettingsChange }: Props) {
  const t = useTranslations('newGame');
  const tPrefs = useTranslations('Preferences');
  const { preferences } = useGamePreferences();
  const [isOpen, setIsOpen] = useState(false);

  // Bridge PerGamePreferences to full GamePreferences for GameSettingsContent
  const settingsForContent = {
    ...preferences,
    ...settings,
  };

  return (
    <div className="space-y-6">
      {/* Board visibility — 3-way picker. Always visible (not inside the
          collapse) because it is the primary choice that controls whether
          the rest of the visual settings are even relevant. */}
      <div>
        <h4 className="text-sm text-foreground mb-2">{tPrefs('game.boardVisibility')}</h4>
        <BoardVisibilityPicker
          value={settings.boardVisibility}
          onChange={(boardVisibility) => onSettingsChange({ boardVisibility })}
          fullWidth
        />
      </div>

      {/* Board peek mode — sits directly under the visibility picker that gates
          it. Only meaningful for 'peek'; for 'always' the board is permanently
          shown and for 'never' there is nothing to peek at. Editable here so
          the new-game form, the Preferences page, and the mid-game modal all
          expose it consistently. */}
      {settings.boardVisibility === 'peek' && (
        <PeekModePicker
          value={settings.peekMode}
          onChange={(peekMode) => onSettingsChange({ peekMode })}
        />
      )}

      {settings.boardVisibility !== 'never' && (
        <div>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 text-sm text-foreground"
          >
            <span>{t('gameSettings')}</span>
            <FaChevronDown
              className={`w-3 h-3 text-muted-foreground transition-transform ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
          {isOpen && (
            <div className="mt-4">
              <GameSettingsContent
                settings={settingsForContent}
                onSettingsChange={onSettingsChange}
                showBoardButtonOption={false}
                showBoardAppearance={false}
                showPreview={true}
                compact={true}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
