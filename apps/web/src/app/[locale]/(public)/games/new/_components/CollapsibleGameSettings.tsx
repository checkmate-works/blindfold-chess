'use client';

import type { ChangeEvent } from 'react';
import { useState } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaChevronDown } from 'react-icons/fa';

import { GameSettingsContent } from '@/app/[locale]/(public)/preferences/_components/GameSettingsContent';
import { PreferenceOption } from '@/app/[locale]/(public)/preferences/_components/PreferenceOption';
import type { PerGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

type Props = {
  settings: PerGamePreferences;
  onSettingsChange: (updates: Partial<PerGamePreferences>) => void;
};

export function CollapsibleGameSettings({ settings, onSettingsChange }: Props) {
  const t = useTranslations('newGame');
  const { preferences } = useGamePreferences();
  const [isOpen, setIsOpen] = useState(false);

  // Bridge PerGamePreferences to full GamePreferences for GameSettingsContent
  const settingsForContent = {
    ...preferences,
    ...settings,
  };

  const handleShowBoardButtonChange = (e: ChangeEvent<HTMLInputElement>) => {
    onSettingsChange({ showBoardButtonInGame: e.target.checked });
  };

  return (
    <div className="bg-card rounded-md border border-border">
      <div className="px-4 py-3">
        <PreferenceOption
          type="checkbox"
          checked={settings.showBoardButtonInGame}
          onChange={handleShowBoardButtonChange}
          label={t('showBoardButtonInGame')}
          variant="plain"
        />
      </div>

      {settings.showBoardButtonInGame && (
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
