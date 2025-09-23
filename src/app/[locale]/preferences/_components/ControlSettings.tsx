'use client';

import { useTranslations } from 'next-intl';
import { useGamePreferences } from '../../_contexts/GamePreferencesContext';

export function ControlSettings() {
  const { preferences, updatePreferences } = useGamePreferences();
  const t = useTranslations('Preferences');

  return (
    <div className="max-w-2xl">
      <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
        {/* Move Input Mode */}
        <div className="space-y-4">
          <div>
            <h4 className="text-lg font-semibold text-foreground mb-4">
              {t('controls.moveInput')}
            </h4>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="moveInputMode"
                  value="text"
                  checked={preferences.moveInputMode === 'text'}
                  onChange={() => updatePreferences({ moveInputMode: 'text' })}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-muted-foreground">
                  {t('controls.textInput')} - {t('controls.textInputDescription')}
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="radio"
                  name="moveInputMode"
                  value="select"
                  checked={preferences.moveInputMode === 'select'}
                  onChange={() => updatePreferences({ moveInputMode: 'select' })}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-muted-foreground">
                  {t('controls.selectInput')} - {t('controls.selectInputDescription')}
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
