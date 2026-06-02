'use client';

import { useState } from 'react';

import Image from 'next/image';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaChevronDown } from 'react-icons/fa';

import type { EngineConfig } from '@/lib/engines';
import { ENGINE_LOGO_SRC } from '@/lib/engines';
import type { PreferenceChangeLogEntry } from '@/lib/games/saved-game-types';

import { Modal } from '@/app/[locale]/_components/Modal';
import type { PerGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  /**
   * AI opponent + difficulty driving this game. Rendered always-visible at
   * the top of the modal as the "Opponent" block: the data is tiny (engine
   * name + one number) and is the first thing players want to see when
   * opening Game Details, so the collapsed-by-default treatment used for
   * the deeper audit sections would be needless friction here.
   */
  engineConfig: EngineConfig;
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
  engineConfig,
  gamePreferences,
  preferenceChangeLog,
}: Props) {
  const t = useTranslations('play');
  const tPrefs = useTranslations('Preferences.game');
  const tPrefsControls = useTranslations('Preferences.controls');

  // Both audit sections start closed: the modal is the "what configuration
  // did this game run under, and what changed" surface — open-by-default
  // would put too much detail in front of users who just popped it open
  // for a quick check. Per-move operation counts live next to each move
  // in the MovesPanel (Phase 5b); the modal no longer carries that table.
  const [isInitialSettingsOpen, setIsInitialSettingsOpen] = useState(false);
  const [isChangeLogOpen, setIsChangeLogOpen] = useState(false);

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
      case 'moveInputMode':
        return t('operationLog.initialSettings.labelMoveInputMode');
    }
  };

  // Localized value rendering for a change-log entry's from/to. Booleans use
  // the same On/Off vocabulary as Initial Settings; enum values reuse the
  // canonical Preferences.* labels so the modal stays in lockstep with the
  // settings page the user already knows.
  //
  // `peekMode` and `moveInputMode` were promoted to per-game later than the
  // other fields, so legacy `initialPerGamePrefs` snapshots may lack them.
  // When such a game's user toggles one of those settings mid-game, the
  // resulting change-log entry's `from` is genuinely undefined ("not
  // recorded") — fold-then-write does not invent a default for fields the
  // snapshot never carried. Render that as the same em-dash the Initial
  // Settings section uses, instead of letting it leak through as the raw
  // i18n key `moveInputModes.undefined`.
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
      case 'moveInputMode':
        return value
          ? tPrefsControls(`moveInputModes.${value as PerGamePreferences['moveInputMode']}`)
          : '—';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('gameDetails.title')} maxWidth="max-w-lg">
      <div className="space-y-6">
        {/* Opponent — always visible, no collapse. See `engineConfig` prop
            doc for the design rationale. */}
        <section className="bg-card rounded-md border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <span className="text-sm font-medium text-foreground">{t('engineInfo.title')}</span>
          </div>
          <dl className="text-sm divide-y divide-border/50">
            <div className="flex justify-between gap-3 px-4 py-2">
              <dt className="text-muted-foreground">{t('engineInfo.engineLabel')}</dt>
              <dd className="flex items-center gap-1.5 text-right">
                {/* Reuse the same engine logo asset as EngineConfigBadge /
                    the games-list rows so the engine identity reads
                    consistently across the app. 18px matches the badge's
                    sizing — small enough to sit beside body-sized text
                    without dominating, large enough that the Stockfish /
                    Maia silhouettes remain recognisable. */}
                <Image
                  src={ENGINE_LOGO_SRC[engineConfig.kind]}
                  alt=""
                  width={18}
                  height={18}
                  className="object-contain"
                />
                <span>{engineConfig.kind === 'maia' ? 'Maia' : 'Stockfish'}</span>
              </dd>
            </div>
            <div className="flex justify-between gap-3 px-4 py-2">
              <dt className="text-muted-foreground">{t('engineInfo.difficultyLabel')}</dt>
              <dd className="text-right">
                {engineConfig.kind === 'maia'
                  ? t('engineInfo.maiaDifficulty', { rating: engineConfig.rating })
                  : t('engineInfo.stockfishDifficulty', { level: engineConfig.skillLevel })}
              </dd>
            </div>
          </dl>
        </section>

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
      </div>
    </Modal>
  );
}
