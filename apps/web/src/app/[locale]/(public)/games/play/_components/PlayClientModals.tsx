'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { EngineConfig } from '@/lib/engines';
import type { PreferenceChangeLogEntry } from '@/lib/games/saved-game-types';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import type {
  GamePreferences,
  PerGamePreferences,
} from '@/app/[locale]/_contexts/GamePreferencesContext';

import type { useConfirmationDialogs } from '../_hooks';
import { MidGameSettingsModal } from './MidGameSettingsModal';
import { OperationLogModal } from './OperationLogModal';

type ConfirmationDialogs = ReturnType<typeof useConfirmationDialogs>;

/**
 * The overlays the play page renders alongside the main board + panel grid:
 * resign / undo / restart confirmations, the game-details (`OperationLogModal`),
 * and the mid-game `MidGameSettingsModal`.
 *
 * Extracted out of `PlayClient.tsx` because the page composition was
 * dominated by ~80 lines of repeated `<ConfirmationModal isOpen={...} />`
 * blocks plus three more component overlays — none of which interact
 * with the page's loading skeleton, board layout, or move panel.
 * Pulling them into a single subtree leaves PlayClient as a clearer
 * "in-progress vs initializing, board area vs move-list" composition
 * and centralises the i18n + dialog wiring in one place.
 *
 * Props are intentionally a flat bag of the values each modal reads —
 * not a more clever "render each modal with its own slice" abstraction.
 * Five modals isn't enough for the abstraction to pay back the API
 * surface, and the flat shape stays easy to grep when adding a sixth.
 */
type Props = {
  confirmationDialogs: ConfirmationDialogs;
  // Operation log modal
  showOperationLogModal: boolean;
  onCloseOperationLog: () => void;
  engineConfig: EngineConfig;
  initialPerGamePrefs: PerGamePreferences | undefined;
  preferenceChangeLog: PreferenceChangeLogEntry[];
  // Mid-game settings modal
  canEditPerGameSettings: boolean;
  showSettingsModal: boolean;
  onCloseSettingsModal: () => void;
  preferences: GamePreferences;
  onPerGamePrefChange: <K extends keyof PerGamePreferences>(
    key: K,
    value: PerGamePreferences[K]
  ) => void;
};

export function PlayClientModals({
  confirmationDialogs,
  showOperationLogModal,
  onCloseOperationLog,
  engineConfig,
  initialPerGamePrefs,
  preferenceChangeLog,
  canEditPerGameSettings,
  showSettingsModal,
  onCloseSettingsModal,
  preferences,
  onPerGamePrefChange,
}: Props) {
  const t = useTranslations('play');

  return (
    <>
      {/* Resign Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmationDialogs.resign.isOpen}
        onCancel={confirmationDialogs.resign.close}
        onConfirm={confirmationDialogs.resign.confirm}
        title={t('confirmResignTitle')}
        message={t('confirmResignMessage')}
        confirmText={t('confirmResign')}
        cancelText={t('cancel')}
        confirmVariant="danger"
      />

      {/* Undo Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmationDialogs.undo.isOpen}
        onCancel={confirmationDialogs.undo.close}
        onConfirm={confirmationDialogs.undo.confirm}
        title={t('confirmUndoTitle')}
        message={t('confirmUndoMessage')}
        confirmText={t('confirmUndo')}
        cancelText={t('cancel')}
      />

      {/* Restart Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmationDialogs.restart.isOpen}
        onCancel={confirmationDialogs.restart.close}
        onConfirm={confirmationDialogs.restart.confirm}
        title={t('confirmRestartTitle')}
        message={t('confirmRestartMessage')}
        confirmText={t('confirmRestart')}
        cancelText={t('cancel')}
      />

      {/* Game Details Modal — Opponent + Initial Settings + Change Log */}
      <OperationLogModal
        isOpen={showOperationLogModal}
        onClose={onCloseOperationLog}
        engineConfig={engineConfig}
        gamePreferences={initialPerGamePrefs}
        preferenceChangeLog={preferenceChangeLog}
      />

      {/* Mid-game Settings Modal. Always rendered when an initial snapshot
          exists; its open/close state is driven by `showSettingsModal`.
          The modal mutates the per-game change log directly via
          `onPerGamePrefChange` — every change is one log entry, which
          keeps the audit honest (matching the inline-peek auto-collapse
          + operation-log pattern). */}
      {canEditPerGameSettings && (
        <MidGameSettingsModal
          isOpen={showSettingsModal}
          onClose={onCloseSettingsModal}
          preferences={preferences}
          onPerGamePrefChange={onPerGamePrefChange}
        />
      )}
    </>
  );
}
