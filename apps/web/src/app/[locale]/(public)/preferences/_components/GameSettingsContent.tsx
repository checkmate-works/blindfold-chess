'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { Side } from '@blindfold-chess/types';

import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { BoardAppearanceContent } from './BoardAppearanceContent';
import { BoardPreview } from './BoardPreview';
import { BoardVisibilityPicker } from './BoardVisibilityPicker';

const allShapeOptions = ['normal', 'circles-all', 'circles-own', 'circles-opponent'] as const;

// Piece visibility is exposed as a single-choice radio rather than two
// independent checkboxes: the would-be fourth combination (neither side shown)
// is just a piece-less board, indistinguishable from "Hide the board", so the
// three meaningful modes below cover the space without the redundant state — and
// fit on one row.
const PIECE_VISIBILITY_MODES = ['all', 'own', 'opponent'] as const;
const PIECE_VISIBILITY_PRESETS: Record<
  (typeof PIECE_VISIBILITY_MODES)[number],
  { showOwnPieces: boolean; showOpponentPieces: boolean }
> = {
  all: { showOwnPieces: true, showOpponentPieces: true },
  own: { showOwnPieces: true, showOpponentPieces: false },
  opponent: { showOwnPieces: false, showOpponentPieces: true },
};

// Piece shape is exposed as a "show as stones" toggle plus a side selector that
// only appears when both sides are visible (the only case where stoning just one
// side is meaningful). The three sides reuse the Both / Own / Opponent labels.
const STONE_SIDE_MODES = ['all', 'own', 'opponent'] as const;
const STONE_SIDE_TO_SHAPE: Record<
  (typeof STONE_SIDE_MODES)[number],
  GamePreferences['pieceShapeMode']
> = {
  all: 'circles-all',
  own: 'circles-own',
  opponent: 'circles-opponent',
};

type Props = {
  settings: GamePreferences;
  onSettingsChange: (updates: Partial<GamePreferences>) => void;
  playerSide?: Side;
  showPreview?: boolean;
  showBoardAppearance?: boolean;
  /**
   * Controls whether the top-level board-visibility picker is shown. Renamed
   * conceptually from the previous boolean `showBoardButtonInGame` toggle to
   * the 3-state `boardVisibility` picker; the prop name is kept for API
   * compatibility with existing callers.
   */
  showBoardButtonOption?: boolean;
  /**
   * Slot rendered immediately after the boardVisibility picker (and before
   * the other display / piece / preview sections). Used by the mid-game
   * settings modal to surface the Board Peek Mode picker right next to the
   * choice that gates it. The new-game form and the global Preferences "Game"
   * tab achieve the same placement via `CollapsibleGameSettings`, which renders
   * its own picker outside this component, so they leave this slot empty.
   */
  afterBoardVisibility?: ReactNode;
  compact?: boolean;
};

export function GameSettingsContent({
  settings,
  onSettingsChange,
  playerSide = 'white',
  showPreview = true,
  showBoardAppearance = true,
  showBoardButtonOption = true,
  afterBoardVisibility = null,
  compact = true,
}: Props) {
  const t = useTranslations('Preferences');

  const availableShapeOptions = useMemo(() => {
    return allShapeOptions.filter((mode) => {
      if (mode === 'normal') return true;
      if (mode === 'circles-all') return settings.showOwnPieces && settings.showOpponentPieces;
      if (mode === 'circles-own') return settings.showOwnPieces;
      if (mode === 'circles-opponent') return settings.showOpponentPieces;
      return false;
    });
  }, [settings.showOwnPieces, settings.showOpponentPieces]);

  // Map the two underlying booleans to the radio's single choice. The
  // neither-shown legacy combination (unreachable from the radio) falls back to
  // 'own' and self-heals on the next selection.
  const pieceVisibilityMode = settings.showOwnPieces
    ? settings.showOpponentPieces
      ? 'all'
      : 'own'
    : 'opponent';

  // Piece shape derived state. `stonesOn` = any non-normal shape; the side
  // selector only matters when both sides are visible. `stonesDefaultShape` is
  // the stones mode for whatever is visible right now — used when turning stones
  // on and when realigning an out-of-range shape after a visibility change.
  const stonesOn = settings.pieceShapeMode !== 'normal';
  const bothVisible = settings.showOwnPieces && settings.showOpponentPieces;
  const stonesDefaultShape: GamePreferences['pieceShapeMode'] = bothVisible
    ? 'circles-all'
    : settings.showOwnPieces
      ? 'circles-own'
      : 'circles-opponent';
  const stonesSide =
    settings.pieceShapeMode === 'circles-own'
      ? 'own'
      : settings.pieceShapeMode === 'circles-opponent'
        ? 'opponent'
        : 'all';

  useEffect(() => {
    // When a visibility change makes the current stones mode invalid (e.g.
    // 'circles-all' after hiding a side), realign it to the stones mode for
    // what is visible now instead of dropping to 'normal' — this keeps the
    // "show as stones" toggle on across visibility changes. 'normal' is always
    // valid, so a stones-off board is never disturbed.
    if (!availableShapeOptions.includes(settings.pieceShapeMode)) {
      onSettingsChange({ pieceShapeMode: stonesDefaultShape });
    }
  }, [availableShapeOptions, settings.pieceShapeMode, stonesDefaultShape, onSettingsChange]);

  const containerClass = compact ? '' : 'bg-card rounded-md p-6 border border-border';

  return (
    <div className={containerClass}>
      <div className="space-y-8">
        {/* Board Visibility — 3-way picker (always / peek / never).
            Replaces the legacy `showBoardButtonInGame` boolean. The
            piece-visibility / appearance sub-sections below are gated on
            `boardVisibility !== 'never'` so they appear for both 'always'
            (board permanently shown) and 'peek' (board shown on demand)
            modes — the visual settings matter equally in both. */}
        {showBoardButtonOption && (
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">
              {t('game.boardVisibility')}
            </h4>
            <BoardVisibilityPicker
              value={settings.boardVisibility}
              onChange={(value) => onSettingsChange({ boardVisibility: value })}
            />
          </div>
        )}

        {/* Slot for content the caller wants immediately after the
            board-visibility picker. The mid-game settings modal uses this
            to show the Board Peek Mode picker next to the choice that
            actually gates it. */}
        {afterBoardVisibility}

        {/* Board Appearance */}
        {showBoardAppearance && (
          <BoardAppearanceContent settings={settings} onSettingsChange={onSettingsChange} />
        )}

        {/* Display Options & Piece Visibility & Appearance — shown whenever
            the board IS surfaced (peek OR always); hidden only when
            boardVisibility is 'never' (pure blindfold, nothing to see). */}
        {settings.boardVisibility !== 'never' && (
          <>
            {/* Piece Appearance — piece visibility, stone obfuscation and
                colour grouped together, since they all govern how the pieces
                look. (Piece visibility always leaves at least one side shown, so
                the appearance controls below are always relevant.) */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4">
                {t('game.pieceAppearance')}
              </h4>
              <div className="space-y-3">
                {/* Piece Visibility */}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-foreground">{t('game.pieceVisibility')}</span>
                  <div className="flex items-center gap-4">
                    {PIECE_VISIBILITY_MODES.map((mode) => (
                      <label
                        key={mode}
                        className="flex cursor-pointer items-center gap-1.5 text-sm text-foreground"
                      >
                        <input
                          type="radio"
                          name="pieceVisibility"
                          value={mode}
                          checked={pieceVisibilityMode === mode}
                          onChange={() => onSettingsChange(PIECE_VISIBILITY_PRESETS[mode])}
                          className="h-4 w-4 text-primary focus:ring-primary border-border"
                        />
                        <span>{t(`game.pieceVisibilityModes.${mode}`)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Show as stones — the side selector only appears when both
                    sides are visible (the only case where stoning a single side
                    is meaningful). */}
                <label className="flex cursor-pointer items-center justify-between gap-3">
                  <span className="text-sm text-foreground">{t('game.showAsStones')}</span>
                  <input
                    type="checkbox"
                    checked={stonesOn}
                    onChange={(e) =>
                      onSettingsChange({
                        pieceShapeMode: e.target.checked ? stonesDefaultShape : 'normal',
                      })
                    }
                    className="h-4 w-4 text-primary focus:ring-primary border-border"
                  />
                </label>
                {stonesOn && bothVisible && (
                  <div className="flex items-center justify-between gap-3 border-l border-border pl-4">
                    <span className="text-sm text-muted-foreground">{t('game.stonesSide')}</span>
                    <div className="flex items-center gap-4">
                      {STONE_SIDE_MODES.map((side) => (
                        <label
                          key={side}
                          className="flex cursor-pointer items-center gap-1.5 text-sm text-foreground"
                        >
                          <input
                            type="radio"
                            name="stonesSide"
                            value={side}
                            checked={stonesSide === side}
                            onChange={() =>
                              onSettingsChange({ pieceShapeMode: STONE_SIDE_TO_SHAPE[side] })
                            }
                            className="h-4 w-4 text-primary focus:ring-primary border-border"
                          />
                          <span>{t(`game.pieceVisibilityModes.${side}`)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Piece Color */}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-foreground">{t('game.pieceColor')}</span>
                  <div className="flex items-center gap-4">
                    {(['normal', 'white-only', 'black-only'] as const).map((colors) => (
                      <label
                        key={colors}
                        className="flex cursor-pointer items-center gap-1.5 text-sm text-foreground"
                      >
                        <input
                          type="radio"
                          name="pieceColors"
                          value={colors}
                          checked={settings.pieceColors === colors}
                          onChange={(e) =>
                            onSettingsChange({ pieceColors: e.target.value as typeof colors })
                          }
                          className="h-4 w-4 text-primary focus:ring-primary border-border"
                        />
                        <span>{t(`game.pieceColorModes.${colors}`)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Display Options — lower priority, so kept near the bottom (just
                above the preview, which reflects these settings). */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4">
                {t('game.displayOptions')}
              </h4>
              <div className="space-y-3">
                <label className="flex cursor-pointer items-center justify-between gap-3">
                  <span className="text-sm text-foreground">{t('game.highlightLastMove')}</span>
                  <input
                    type="checkbox"
                    checked={settings.highlightLastMove}
                    onChange={(e) => onSettingsChange({ highlightLastMove: e.target.checked })}
                    className="h-4 w-4 text-primary focus:ring-primary border-border"
                  />
                </label>
                <label className="flex cursor-pointer items-center justify-between gap-3">
                  <span className="text-sm text-foreground">{t('game.pieceDestinations')}</span>
                  <input
                    type="checkbox"
                    checked={settings.showPieceDestinations}
                    onChange={(e) => onSettingsChange({ showPieceDestinations: e.target.checked })}
                    className="h-4 w-4 text-primary focus:ring-primary border-border"
                  />
                </label>
              </div>
            </div>

            {/* Preview */}
            {showPreview && <BoardPreview settings={settings} playerSide={playerSide} />}
          </>
        )}
      </div>
    </div>
  );
}
