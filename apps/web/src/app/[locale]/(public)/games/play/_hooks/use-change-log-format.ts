'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { aiReplyDurationLabel } from '@/lib/games/ai-reply-duration';
import type { PreferenceChangeLogEntry } from '@/lib/games/saved-game-types';

import type { PerGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

/**
 * Localised label + value formatting for a {@link PreferenceChangeLogEntry},
 * shared by the Game Details modal's Change Log table and the result-page
 * inline change list so both name the same fields and render the same
 * before/after vocabulary.
 *
 * Labels reuse the Initial Settings keys (`play.operationLog.initialSettings.*`);
 * values reuse the canonical `Preferences.*` enum labels so the wording stays in
 * lockstep with the settings page the user already knows. Booleans render as the
 * Initial Settings On/Off vocabulary.
 */
export function useChangeLogFormat() {
  const t = useTranslations('play');
  const tPrefs = useTranslations('Preferences.game');
  const tPrefsControls = useTranslations('Preferences.controls');

  const renderBool = (v: boolean): string =>
    v ? t('operationLog.initialSettings.on') : t('operationLog.initialSettings.off');

  const settingLabel = (key: PreferenceChangeLogEntry['key']): string => {
    switch (key) {
      case 'boardVisibility':
        return t('operationLog.initialSettings.labelBoardVisibility');
      case 'highlightLastMove':
        return t('operationLog.initialSettings.labelHighlightLastMove');
      case 'showPieceDestinations':
        return t('operationLog.initialSettings.labelPieceDestinations');
      case 'showOwnPieces':
        return t('operationLog.initialSettings.labelShowOwnPieces');
      case 'showOpponentPieces':
        return t('operationLog.initialSettings.labelShowOpponentPieces');
      case 'pieceShapeMode':
        return t('operationLog.initialSettings.labelPieceShape');
      case 'pieceColors':
        return t('operationLog.initialSettings.labelPieceColor');
      case 'pawnHideMode':
        return t('operationLog.initialSettings.labelPawnHide');
      case 'moveInputMode':
        return t('operationLog.initialSettings.labelMoveInputMode');
      case 'aiReplyDuration':
        return t('operationLog.initialSettings.labelAiReplyDuration');
    }
  };

  // `peekMode` and `moveInputMode` were promoted to per-game later than the
  // other fields, so legacy `initialPerGamePrefs` snapshots may lack them.
  // When such a game's user toggles one of those settings mid-game, the
  // resulting change-log entry's `from` is genuinely undefined ("not
  // recorded") — render that as an em-dash instead of leaking the raw i18n key.
  const settingValue = (entry: PreferenceChangeLogEntry, which: 'from' | 'to'): string => {
    const value = entry[which];
    switch (entry.key) {
      case 'boardVisibility':
        return tPrefs(`boardVisibilities.${value as PerGamePreferences['boardVisibility']}`);
      case 'highlightLastMove':
      case 'showPieceDestinations':
      case 'showOwnPieces':
      case 'showOpponentPieces':
        return renderBool(value as boolean);
      case 'pieceShapeMode':
        return tPrefs(`pieceShapes.${value as PerGamePreferences['pieceShapeMode']}`);
      case 'pieceColors':
        return tPrefs(`pieceColors.${value as PerGamePreferences['pieceColors']}`);
      case 'pawnHideMode':
        return tPrefs(`pawnHideModes.${value as PerGamePreferences['pawnHideMode']}`);
      case 'moveInputMode':
        return value
          ? tPrefsControls(`moveInputModes.${value as PerGamePreferences['moveInputMode']}`)
          : '—';
      case 'aiReplyDuration': {
        if (value === undefined) return '—';
        const { key, params } = aiReplyDurationLabel(value as number);
        return tPrefs(key, params);
      }
    }
  };

  return { settingLabel, settingValue };
}
