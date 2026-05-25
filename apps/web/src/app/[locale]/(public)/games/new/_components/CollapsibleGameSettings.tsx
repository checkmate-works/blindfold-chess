'use client';

import { useState } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaChevronDown } from 'react-icons/fa';

import { BOARD_VISIBILITY_VALUES } from '@/lib/games/board-visibility';
import { BOARD_VISIBILITY_ICON } from '@/lib/games/board-visibility-icons';

import { GameSettingsContent } from '@/app/[locale]/(public)/preferences/_components/GameSettingsContent';
import type { PerGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

type Props = {
  settings: PerGamePreferences;
  onSettingsChange: (updates: Partial<PerGamePreferences>) => void;
};

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
    <div className="bg-card rounded-md border border-border">
      {/* Board visibility — 3-way picker. Always visible (not inside the
          collapse) because it is the primary choice that controls whether
          the rest of the visual settings are even relevant. */}
      <div className="px-4 py-3">
        <div className="text-sm font-medium text-foreground mb-2">
          {tPrefs('game.boardVisibility')}
        </div>
        {/* Full-width segmented button group: the new-game form has plenty
            of horizontal room on PC widths, and stretching the picker fills
            that whitespace cleanly. Mobile widths render essentially as
            before (the buttons were already filling most of the column).
            The narrower `inline-flex` rendering is preserved in the global
            Preferences page and the mid-game settings modal, where the
            picker sits alongside other text in a denser layout. */}
        <div className="flex rounded-md border border-border overflow-hidden">
          {BOARD_VISIBILITY_VALUES.map((value, idx) => {
            const Icon = BOARD_VISIBILITY_ICON[value];
            return (
              <button
                key={value}
                type="button"
                onClick={() => onSettingsChange({ boardVisibility: value })}
                className={`flex-1 px-3 py-1.5 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                  settings.boardVisibility === value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-foreground hover:bg-muted'
                } ${idx < BOARD_VISIBILITY_VALUES.length - 1 ? 'border-r border-border' : ''}`}
              >
                <Icon className="w-3 h-3" />
                {tPrefs(`game.boardVisibilities.${value}`)}
              </button>
            );
          })}
        </div>
      </div>

      {settings.boardVisibility !== 'never' && (
        <>
          <div className="border-t border-border" />
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="w-full flex items-center justify-between px-4 py-3 text-left"
          >
            <span className="text-sm font-medium text-foreground">{t('gameSettings')}</span>
            <FaChevronDown
              className={`w-3 h-3 text-muted-foreground transition-transform ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
          {isOpen && (
            <div className="px-4 pb-4">
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
        </>
      )}
    </div>
  );
}
