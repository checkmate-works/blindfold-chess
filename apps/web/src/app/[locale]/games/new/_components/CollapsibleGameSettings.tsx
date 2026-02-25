'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { FaChevronDown } from 'react-icons/fa';

import type { PerGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import { GameSettingsContent } from '@/app/[locale]/preferences/_components/GameSettingsContent';

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

  return (
    <div className="bg-card rounded-md shadow-sm border border-border">
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
            showBoardAppearance={false}
            showPreview={true}
            compact={true}
          />
        </div>
      )}
    </div>
  );
}
