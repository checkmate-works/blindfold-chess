'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

type PeekMode = 'modal' | 'inline';

type Props = {
  value: PeekMode;
  onChange: (mode: PeekMode) => void;
};

/**
 * Board peek mode picker (modal vs inline accordion). Shared by every surface
 * that lets the user pick how the board surfaces when `boardVisibility ===
 * 'peek'`: the new-game form's `CollapsibleGameSettings`, the global
 * Preferences "Game" tab (via the same component), and the mid-game settings
 * modal. Callers are responsible for gating on `boardVisibility === 'peek'` and
 * for any surrounding padding / dividers — this component renders only the
 * label and the modal/inline toggle.
 *
 * Translation keys intentionally still live under the `Preferences.controls.*`
 * namespace (they predate the move of this control out of the Controls tab);
 * the key location is internal and does not need to track the UI location.
 */
export function PeekModePicker({ value, onChange }: Props) {
  const t = useTranslations('Preferences');

  return (
    <div>
      <h4 className="text-lg font-semibold text-foreground mb-4">{t('controls.peekMode')}</h4>
      <div className="inline-flex rounded-md border border-border overflow-hidden">
        {(['modal', 'inline'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onChange(mode)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              value === mode
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-foreground hover:bg-muted'
            } ${mode === 'modal' ? 'border-r border-border' : ''}`}
          >
            {t(`controls.peekModes.${mode}`)}
          </button>
        ))}
      </div>
    </div>
  );
}
