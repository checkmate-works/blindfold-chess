'use client';

import { useState } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { AlgebraicNotation, Side } from '@blindfold-chess/types';
import { FaChevronDown } from 'react-icons/fa';

import type { MoveOperationLog, PreferenceChangeLogEntry } from '@/lib/games/saved-game-types';

import { Modal } from '@/app/[locale]/_components/Modal';
import type { PerGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { getMovingSide } from '../_lib/fen-utils';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  logs: MoveOperationLog[];
  moves: AlgebraicNotation[];
  playerSide: Side;
  startingFen?: string;
  /**
   * Snapshot of the per-game preferences captured at game start. Surfaced
   * here as a read-only "Initial Settings" section so the player can review
   * what configuration the game was actually played under. Undefined for
   * legacy games saved before `gamePreferences` was persisted; a "not
   * recorded" notice renders in that case.
   */
  gamePreferences?: PerGamePreferences;
  /**
   * Append-only timeline of mid-game preference edits. Rendered in the
   * "Change Log" section. Empty or undefined for games where the player
   * did not change any settings mid-game (the overwhelmingly common case).
   * Positioned as a self-review history — not framed as tamper-proof
   * evidence, since localStorage is client-writable.
   */
  preferenceChangeLog?: PreferenceChangeLogEntry[];
};

export function OperationLogModal({
  isOpen,
  onClose,
  logs,
  moves,
  playerSide,
  startingFen,
  gamePreferences,
  preferenceChangeLog,
}: Props) {
  const t = useTranslations('play');
  const tPrefs = useTranslations('Preferences.game');
  const tPrefsControls = useTranslations('Preferences.controls');

  // Both audit sections start closed: the per-move log table is the modal's
  // primary content, so we don't push it below the fold for users that
  // mostly care about ops review. Users curious about the initial setup or
  // the in-game edit history expand on demand.
  const [isInitialSettingsOpen, setIsInitialSettingsOpen] = useState(false);
  const [isChangeLogOpen, setIsChangeLogOpen] = useState(false);

  // Extract player moves from the interleaved moves array.
  // Uses getMovingSide to correctly handle custom starting FEN (e.g., black-to-move positions).
  const playerMoveIndices = moves.reduce<number[]>((acc, _, index) => {
    if (getMovingSide(index, startingFen) === playerSide) acc.push(index);
    return acc;
  }, []);

  const inputMethodLabel = (method: MoveOperationLog['inputMethod']): string => {
    switch (method) {
      case 'button':
        return t('operationLog.inputMethodButton');
      case 'text':
        return t('operationLog.inputMethodText');
      case 'text-autocomplete':
        return t('operationLog.inputMethodTextAutocomplete');
      case 'select':
        return t('operationLog.inputMethodSelect');
      case 'board':
        return t('operationLog.inputMethodBoard');
      default:
        return method;
    }
  };

  const renderBool = (v: boolean): string =>
    v ? t('operationLog.initialSettings.on') : t('operationLog.initialSettings.off');

  // Localized field label for a change-log entry. Reuses the Initial Settings
  // label keys so the two sections refer to the same fields by the same name.
  const settingLabel = (key: PreferenceChangeLogEntry['key']): string => {
    switch (key) {
      case 'boardVisibility':
        return t('operationLog.initialSettings.labelBoardVisibility');
      case 'highlightLastMove':
        return t('operationLog.initialSettings.labelHighlightLastMove');
      case 'showOwnPieces':
        return t('operationLog.initialSettings.labelShowOwnPieces');
      case 'showOpponentPieces':
        return t('operationLog.initialSettings.labelShowOpponentPieces');
      case 'pieceShapeMode':
        return t('operationLog.initialSettings.labelPieceShape');
      case 'pieceColors':
        return t('operationLog.initialSettings.labelPieceColor');
      case 'peekMode':
        return t('operationLog.initialSettings.labelPeekMode');
      case 'moveInputMode':
        return t('operationLog.initialSettings.labelMoveInputMode');
    }
  };

  // Localized value rendering for a change-log entry's from/to. Booleans use
  // the same On/Off vocabulary as Initial Settings; enum values reuse the
  // canonical Preferences.* labels so the modal stays in lockstep with the
  // settings page the user already knows.
  const settingValue = (entry: PreferenceChangeLogEntry, which: 'from' | 'to'): string => {
    const value = entry[which];
    switch (entry.key) {
      case 'boardVisibility':
        return tPrefs(`boardVisibilities.${value as PerGamePreferences['boardVisibility']}`);
      case 'highlightLastMove':
      case 'showOwnPieces':
      case 'showOpponentPieces':
        return renderBool(value as boolean);
      case 'pieceShapeMode':
        return tPrefs(`pieceShapes.${value as PerGamePreferences['pieceShapeMode']}`);
      case 'pieceColors':
        return tPrefs(`pieceColors.${value as PerGamePreferences['pieceColors']}`);
      case 'peekMode':
        return tPrefsControls(`peekModes.${value as PerGamePreferences['peekMode']}`);
      case 'moveInputMode':
        return tPrefsControls(`moveInputModes.${value as PerGamePreferences['moveInputMode']}`);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('operationLog.title')} maxWidth="max-w-lg">
      <div className="space-y-6">
        <section className="bg-card rounded-md border border-border overflow-hidden">
          <button
            type="button"
            onClick={() => setIsInitialSettingsOpen((o) => !o)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted transition-colors"
          >
            <span className="text-sm font-medium text-foreground">
              {t('operationLog.initialSettings.title')}
            </span>
            <FaChevronDown
              className={`w-3 h-3 text-muted-foreground transition-transform ${
                isInitialSettingsOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
          {isInitialSettingsOpen &&
            (gamePreferences ? (
              <dl className="text-sm divide-y divide-border/50 border-t border-border">
                <div className="flex justify-between gap-3 px-4 py-2">
                  <dt className="text-muted-foreground">
                    {t('operationLog.initialSettings.labelBoardVisibility')}
                  </dt>
                  <dd className="text-right">
                    {tPrefs(`boardVisibilities.${gamePreferences.boardVisibility}`)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 px-4 py-2">
                  <dt className="text-muted-foreground">
                    {t('operationLog.initialSettings.labelHighlightLastMove')}
                  </dt>
                  <dd className="text-right">{renderBool(gamePreferences.highlightLastMove)}</dd>
                </div>
                <div className="flex justify-between gap-3 px-4 py-2">
                  <dt className="text-muted-foreground">
                    {t('operationLog.initialSettings.labelShowOwnPieces')}
                  </dt>
                  <dd className="text-right">{renderBool(gamePreferences.showOwnPieces)}</dd>
                </div>
                <div className="flex justify-between gap-3 px-4 py-2">
                  <dt className="text-muted-foreground">
                    {t('operationLog.initialSettings.labelShowOpponentPieces')}
                  </dt>
                  <dd className="text-right">{renderBool(gamePreferences.showOpponentPieces)}</dd>
                </div>
                <div className="flex justify-between gap-3 px-4 py-2">
                  <dt className="text-muted-foreground">
                    {t('operationLog.initialSettings.labelPieceShape')}
                  </dt>
                  <dd className="text-right">
                    {tPrefs(`pieceShapes.${gamePreferences.pieceShapeMode}`)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 px-4 py-2">
                  <dt className="text-muted-foreground">
                    {t('operationLog.initialSettings.labelPieceColor')}
                  </dt>
                  <dd className="text-right">
                    {tPrefs(`pieceColors.${gamePreferences.pieceColors}`)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 px-4 py-2">
                  <dt className="text-muted-foreground">
                    {t('operationLog.initialSettings.labelPeekMode')}
                  </dt>
                  <dd className="text-right">
                    {/* peekMode was added to PerGamePreferences after this
                        modal first shipped, so older snapshots may lack the
                        field. Show an em-dash placeholder rather than
                        inventing a value — honest about what was actually
                        recorded vs not. */}
                    {gamePreferences.peekMode
                      ? tPrefsControls(`peekModes.${gamePreferences.peekMode}`)
                      : '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 px-4 py-2">
                  <dt className="text-muted-foreground">
                    {t('operationLog.initialSettings.labelMoveInputMode')}
                  </dt>
                  <dd className="text-right">
                    {/* moveInputMode also entered PerGamePreferences late —
                        older snapshots default to em-dash for the same
                        recorded-vs-not reason. */}
                    {gamePreferences.moveInputMode
                      ? tPrefsControls(`moveInputModes.${gamePreferences.moveInputMode}`)
                      : '—'}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-muted-foreground text-sm px-4 py-3 border-t border-border">
                {t('operationLog.initialSettings.notRecorded')}
              </p>
            ))}
        </section>

        {/* Change Log — append-only timeline of mid-game preference edits.
            Self-review history only; not framed as tamper-proof evidence
            (localStorage is client-writable). Closed by default so the
            modal's primary content (per-move ops) stays above the fold. */}
        <section className="bg-card rounded-md border border-border overflow-hidden">
          <button
            type="button"
            onClick={() => setIsChangeLogOpen((o) => !o)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted transition-colors"
          >
            <span className="text-sm font-medium text-foreground">
              {t('operationLog.changeLog.title')}
            </span>
            <FaChevronDown
              className={`w-3 h-3 text-muted-foreground transition-transform ${
                isChangeLogOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
          {isChangeLogOpen &&
            (preferenceChangeLog && preferenceChangeLog.length > 0 ? (
              <div className="overflow-x-auto border-t border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="py-2 px-3 font-medium text-muted-foreground">
                        {t('operationLog.changeLog.columnAtMove')}
                      </th>
                      <th className="py-2 px-3 font-medium text-muted-foreground">
                        {t('operationLog.changeLog.columnSetting')}
                      </th>
                      <th className="py-2 px-3 font-medium text-muted-foreground">
                        {t('operationLog.changeLog.columnChange')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {preferenceChangeLog.map((entry, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-muted/50">
                        <td className="py-2 px-3 text-muted-foreground">{entry.atMoveIndex}</td>
                        <td className="py-2 px-3">{settingLabel(entry.key)}</td>
                        <td className="py-2 px-3">
                          {settingValue(entry, 'from')} → {settingValue(entry, 'to')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm px-4 py-3 border-t border-border">
                {t('operationLog.changeLog.noChanges')}
              </p>
            ))}
        </section>

        <section>
          {logs.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('operationLog.noLogs')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="py-2 px-2 font-medium text-muted-foreground">#</th>
                    <th className="py-2 px-2 font-medium text-muted-foreground">
                      {t('operationLog.columnMove')}
                    </th>
                    <th className="py-2 px-2 font-medium text-muted-foreground">
                      {t('operationLog.columnInputMethod')}
                    </th>
                    <th className="py-2 px-2 font-medium text-muted-foreground text-center">
                      {t('operationLog.columnPeek')}
                    </th>
                    <th className="py-2 px-2 font-medium text-muted-foreground text-center">
                      {t('operationLog.columnUndo')}
                    </th>
                    <th className="py-2 px-2 font-medium text-muted-foreground text-center">
                      {t('operationLog.columnMovePeek')}
                    </th>
                    <th className="py-2 px-2 font-medium text-muted-foreground text-center">
                      {t('operationLog.columnInvalid')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, i) => {
                    const moveIndex = playerMoveIndices[i];
                    const move = moveIndex !== undefined ? moves[moveIndex] : '—';
                    return (
                      <tr key={i} className="border-b border-border/50 hover:bg-muted/50">
                        <td className="py-2 px-2 text-muted-foreground">{i + 1}</td>
                        <td className="py-2 px-2 font-mono">{move}</td>
                        <td className="py-2 px-2">{inputMethodLabel(log.inputMethod)}</td>
                        <td className="py-2 px-2 text-center">{log.peekCount}</td>
                        <td className="py-2 px-2 text-center">{log.undoCount}</td>
                        <td className="py-2 px-2 text-center">{log.movePeekCount ?? 0}</td>
                        <td className="py-2 px-2 text-center">{log.invalidCount ?? 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </Modal>
  );
}
