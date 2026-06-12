'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { GameSettingsContent } from '@/app/[locale]/(public)/preferences/_components/GameSettingsContent';
import { Modal } from '@/app/[locale]/_components/Modal';
import type {
  GamePreferences,
  PerGamePreferences,
} from '@/app/[locale]/_contexts/GamePreferencesContext';

const PER_GAME_KEYS = [
  'boardVisibility',
  'highlightLastMove',
  'showPieceDestinations',
  'showOwnPieces',
  'showOpponentPieces',
  'pieceShapeMode',
  'pieceColors',
  'pawnHideMode',
  'aiReplyDuration',
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
      <GameSettingsContent
        settings={preferences}
        onSettingsChange={handleSettingsChange}
        showBoardAppearance={false}
        showBoardButtonOption={true}
        showPreview={false}
        compact={true}
      />
    </Modal>
  );
}

function isPerGameKey(key: string): key is keyof PerGamePreferences {
  return (PER_GAME_KEYS as readonly string[]).includes(key);
}
