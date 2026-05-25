'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { GameSettingsContent } from '@/app/[locale]/(public)/preferences/_components/GameSettingsContent';
import { Modal } from '@/app/[locale]/_components/Modal';
import type {
  GamePreferences,
  PerGamePreferences,
} from '@/app/[locale]/_contexts/GamePreferencesContext';

const PER_GAME_KEYS = [
  'showBoardButtonInGame',
  'highlightLastMove',
  'showOwnPieces',
  'showOpponentPieces',
  'pieceShapeMode',
  'pieceColors',
  'peekMode',
] as const satisfies ReadonlyArray<keyof PerGamePreferences>;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  /**
   * The currently effective full `GamePreferences` (global merged with the
   * per-game current snapshot). Used to populate the form controls. The
   * modal does NOT mutate global preferences; only the per-game subset is
   * editable via `onPerGamePrefChange`.
   */
  preferences: GamePreferences;
  /**
   * Type-safe single-field setter that appends to the per-game change log.
   * Called once per discrete user action (one checkbox toggle, one radio
   * select). Same-value writes are a no-op upstream, so this is safe to
   * call from `GameSettingsContent`'s auto-reset effect too.
   */
  onPerGamePrefChange: <K extends keyof PerGamePreferences>(
    key: K,
    value: PerGamePreferences[K]
  ) => void;
};

/**
 * Modal for editing the per-game preferences mid-game. Reuses the existing
 * `GameSettingsContent` form (the same one the new-game flow and the global
 * Preferences page render) so the controls and their semantics stay in
 * lockstep. Board-appearance and preview panels are hidden — board theme is
 * a global setting, and the live board behind the modal already serves as
 * the preview.
 *
 * Edits flow one-key-at-a-time through {@link Props.onPerGamePrefChange};
 * non-per-game keys emitted by the underlying form (none expected given the
 * `showBoardAppearance={false}` gate, but defensive against future shape
 * widening) are silently ignored.
 */
export function MidGameSettingsModal({ isOpen, onClose, preferences, onPerGamePrefChange }: Props) {
  const t = useTranslations('play');
  const tPrefs = useTranslations('Preferences');

  const handleSettingsChange = (updates: Partial<GamePreferences>) => {
    for (const rawKey of Object.keys(updates)) {
      if (!isPerGameKey(rawKey)) continue;
      const value = updates[rawKey];
      if (value === undefined) continue;
      // Cast safety: `rawKey` is narrowed to a known PerGamePreferences key by
      // `isPerGameKey`, and `value` here is `PerGamePreferences[typeof rawKey]`
      // — but TypeScript cannot relate them across the for-loop. The shape is
      // guaranteed by GameSettingsContent emitting one valid key/value pair per
      // call, so `as never` is the conventional escape hatch.
      onPerGamePrefChange(rawKey, value as never);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('settings.title')} maxWidth="max-w-md">
      <div className="space-y-8">
        <GameSettingsContent
          settings={preferences}
          onSettingsChange={handleSettingsChange}
          showBoardAppearance={false}
          showBoardButtonOption={true}
          showPreview={false}
          compact={true}
        />

        {/* Board peek mode picker. Mirrored from ControlSettingsContent so the
            mid-game modal and the global `/preferences` Controls tab share UI
            grammar. Gated on `showBoardButtonInGame` for the same reason the
            other peek-related rows are — modal/inline distinction is moot when
            the player has no peek button to invoke. */}
        {preferences.showBoardButtonInGame && (
          <>
            <div className="border-t border-border" />
            <div>
              <h4 className="text-lg font-semibold text-foreground mb-2">
                {tPrefs('controls.peekMode')}
              </h4>
              <p className="text-sm text-muted-foreground mb-4">
                {tPrefs('controls.peekModeDescription')}
              </p>
              <div className="inline-flex rounded-md border border-border overflow-hidden">
                {(['modal', 'inline'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => onPerGamePrefChange('peekMode', mode)}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      preferences.peekMode === mode
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card text-foreground hover:bg-muted'
                    } ${mode === 'modal' ? 'border-r border-border' : ''}`}
                  >
                    {tPrefs(`controls.peekModes.${mode}`)}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function isPerGameKey(key: string): key is keyof PerGamePreferences {
  return (PER_GAME_KEYS as readonly string[]).includes(key);
}
