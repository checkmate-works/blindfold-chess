'use client';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { ControlSettingsContent } from './ControlSettingsContent';

export function ControlSettings() {
  const { preferences, updatePreferences } = useGamePreferences();

  return (
    <div className="max-w-2xl">
      <ControlSettingsContent settings={preferences} onSettingsChange={updatePreferences} />
    </div>
  );
}
