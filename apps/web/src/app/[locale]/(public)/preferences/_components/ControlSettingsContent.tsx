'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { PreferenceOption } from './PreferenceOption';

type Props = {
  settings: GamePreferences;
  onSettingsChange: (updates: Partial<GamePreferences>) => void;
};

export function ControlSettingsContent({ settings, onSettingsChange }: Props) {
  const t = useTranslations('Preferences');

  const enabledModes = settings.enabledMoveInputModes;
  const isOnlyEnabled = (mode: GamePreferences['moveInputMode']) =>
    enabledModes.length === 1 && enabledModes[0] === mode;

  const toggleMode = (mode: GamePreferences['moveInputMode']) => {
    const isEnabled = enabledModes.includes(mode);
    if (isEnabled) {
      // Don't allow unchecking the last mode
      if (enabledModes.length <= 1) return;
      const newModes = enabledModes.filter((m) => m !== mode);
      const updates: Partial<GamePreferences> = { enabledMoveInputModes: newModes };
      // If the active mode is being disabled, switch to first remaining enabled mode
      if (settings.moveInputMode === mode) {
        updates.moveInputMode = newModes[0];
      }
      onSettingsChange(updates);
    } else {
      onSettingsChange({ enabledMoveInputModes: [...enabledModes, mode] });
    }
  };

  return (
    <div className="space-y-8">
      {/* The Board Peek Mode picker used to live here, but it configures how the
          board surfaces during play (gated on boardVisibility === 'peek'), so it
          now sits next to the board-visibility picker in the "Game" tab /
          new-game form / mid-game modal. This tab is move-input only. */}
      <div>
        <h4 className="text-lg font-semibold text-foreground mb-4">{t('controls.moveInput')}</h4>
        <div className="space-y-2">
          <PreferenceOption
            type="checkbox"
            checked={enabledModes.includes('text')}
            onChange={() => toggleMode('text')}
            disabled={isOnlyEnabled('text')}
            label={t('controls.textInput')}
            description={t('controls.textInputDescription')}
            descriptionPosition="bottom"
          >
            {enabledModes.includes('text') && (
              <PreferenceOption
                type="checkbox"
                checked={settings.enableAutoComplete}
                onChange={(e) => onSettingsChange({ enableAutoComplete: e.target.checked })}
                label={t('controls.enableAutoComplete')}
                variant="plain"
                className="ml-6"
              />
            )}
          </PreferenceOption>

          <PreferenceOption
            type="checkbox"
            checked={enabledModes.includes('select')}
            onChange={() => toggleMode('select')}
            disabled={isOnlyEnabled('select')}
            label={t('controls.selectInput')}
            description={t('controls.selectInputDescription')}
            descriptionPosition="bottom"
          />

          <PreferenceOption
            type="checkbox"
            checked={enabledModes.includes('button')}
            onChange={() => toggleMode('button')}
            disabled={isOnlyEnabled('button')}
            label={t('controls.buttonInput')}
            description={t('controls.buttonInputDescription')}
            descriptionPosition="bottom"
          >
            {enabledModes.includes('button') && (
              <div className="ml-6 p-3">
                <p className="text-sm font-medium mb-3">{t('controls.buttonLabelStyle')}</p>
                <div className="flex gap-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="buttonInputPieceLabel"
                      value="icon"
                      checked={settings.buttonInputPieceLabel === 'icon'}
                      onChange={() => onSettingsChange({ buttonInputPieceLabel: 'icon' })}
                      className="rounded-full border-border text-primary focus:ring-primary"
                    />
                    <span className="text-sm">{t('controls.icon')}</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="buttonInputPieceLabel"
                      value="text"
                      checked={settings.buttonInputPieceLabel === 'text'}
                      onChange={() => onSettingsChange({ buttonInputPieceLabel: 'text' })}
                      className="rounded-full border-border text-primary focus:ring-primary"
                    />
                    <span className="text-sm">{t('controls.text')}</span>
                  </label>
                </div>
              </div>
            )}
          </PreferenceOption>
        </div>
      </div>
    </div>
  );
}
