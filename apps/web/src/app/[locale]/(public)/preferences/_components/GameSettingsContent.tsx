'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo } from 'react';

import { DiscPiece } from '@/app/_components/chess/DiscPiece';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { ChessPieceIcon } from '@blindfold-chess/icons';
import type { PieceColor, Side } from '@blindfold-chess/types';
import { PIECE_COLOR_MODES } from '@blindfold-chess/types';

import {
  PAWN_HIDE_SIDE_MODES,
  PIECE_COLOR_SAMPLES,
  PIECE_VISIBILITY_MODES,
  PIECE_VISIBILITY_PRESETS,
  STONE_SIDE_MODES,
  STONE_SIDE_TO_SHAPE,
  derivePawnHideOn,
  derivePieceVisibilityMode,
  deriveStonesState,
  getSideColorSamples,
  realignShapeMode,
} from '@/app/[locale]/(public)/preferences/_lib/piece-appearance-model';
import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { AiReplyDurationPicker } from './AiReplyDurationPicker';
import { BoardAppearanceContent } from './BoardAppearanceContent';
import { BoardPreview } from './BoardPreview';
import { BoardVisibilityPicker } from './BoardVisibilityPicker';

/**
 * Compact "what this option looks like" glyph(s) shown next to each radio /
 * toggle, reusing the same vocabulary as the shared-game PlaySettingsIndicator:
 * a pawn (normal pieces) or a Go-stone disc, in the relevant colour(s).
 */
function PieceGlyphs({
  colors,
  disc = false,
}: {
  colors: ReadonlyArray<PieceColor>;
  disc?: boolean;
}) {
  return (
    <span className="flex items-center gap-0.5" aria-hidden>
      {colors.map((c, i) =>
        disc ? (
          <DiscPiece key={i} color={c} size={14} />
        ) : (
          <ChessPieceIcon key={i} type="p" color={c} size={16} />
        )
      )}
    </span>
  );
}

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

  // All boolean↔mode translation and availability rules live in the pure
  // piece-appearance model (preferences/_lib/piece-appearance-model.ts).
  const pieceVisibilityMode = derivePieceVisibilityMode(settings);
  const { stonesOn, bothVisible, stonesDefaultShape, stonesSide } = deriveStonesState(settings);
  const pawnHideOn = derivePawnHideOn(settings);
  const { ownColor, sideSamples } = useMemo(() => getSideColorSamples(playerSide), [playerSide]);

  // Self-heal an out-of-range stones mode after a visibility change (see
  // realignShapeMode for the policy).
  const realignedShapeMode = realignShapeMode(settings);
  useEffect(() => {
    if (realignedShapeMode !== null) {
      onSettingsChange({ pieceShapeMode: realignedShapeMode });
    }
  }, [realignedShapeMode, onSettingsChange]);

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
              // AI move display time rides inside the blindfold group, right
              // under "Allow peeking", as another board-hidden-only sub-setting.
              blindfoldExtra={
                <AiReplyDurationPicker
                  value={settings.aiReplyDuration}
                  onChange={(aiReplyDuration) => onSettingsChange({ aiReplyDuration })}
                />
              }
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
                <div
                  data-tour-id="settings-piece-visibility"
                  className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                >
                  <span className="text-sm text-foreground">{t('game.pieceVisibility')}</span>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
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
                        <PieceGlyphs colors={sideSamples[mode]} />
                        <span>{t(`game.pieceVisibilityModes.${mode}`)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Show as stones — the side selector only appears when both
                    sides are visible (the only case where stoning a single side
                    is meaningful). */}
                <label
                  data-tour-id="settings-stones"
                  className="flex cursor-pointer items-center justify-between gap-3"
                >
                  <span className="flex items-center gap-1.5 text-sm text-foreground">
                    <DiscPiece color={ownColor} size={16} />
                    {t('game.showAsStones')}
                  </span>
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
                  <div className="flex flex-col gap-2 border-l border-border pl-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <span className="text-sm text-muted-foreground">{t('game.stonesSide')}</span>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
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
                          <PieceGlyphs colors={sideSamples[side]} disc />
                          <span>{t(`game.pieceVisibilityModes.${side}`)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Piece Color */}
                <div
                  data-tour-id="settings-piece-color"
                  className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                >
                  <span className="text-sm text-foreground">{t('game.pieceColor')}</span>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    {PIECE_COLOR_MODES.map((colors) => (
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
                        <PieceGlyphs colors={PIECE_COLOR_SAMPLES[colors]} />
                        <span>{t(`game.pieceColorModes.${colors}`)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Hide pawns — a partial blindfold orthogonal to the visibility
                    / shape / color axes above. The side selector (Both / Own /
                    Opponent) appears whenever the toggle is on. */}
                <label
                  data-tour-id="settings-pawn-hide"
                  className="flex cursor-pointer items-center justify-between gap-3"
                >
                  <span className="flex items-center gap-1.5 text-sm text-foreground">
                    <ChessPieceIcon type="p" color={ownColor} size={16} />
                    {t('game.hidePawns')}
                  </span>
                  <input
                    type="checkbox"
                    checked={pawnHideOn}
                    onChange={(e) =>
                      onSettingsChange({ pawnHideMode: e.target.checked ? 'all' : 'none' })
                    }
                    className="h-4 w-4 text-primary focus:ring-primary border-border"
                  />
                </label>
                {pawnHideOn && (
                  <div className="flex flex-col gap-2 border-l border-border pl-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <span className="text-sm text-muted-foreground">{t('game.stonesSide')}</span>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      {PAWN_HIDE_SIDE_MODES.map((side) => (
                        <label
                          key={side}
                          className="flex cursor-pointer items-center gap-1.5 text-sm text-foreground"
                        >
                          <input
                            type="radio"
                            name="pawnHideSide"
                            value={side}
                            checked={settings.pawnHideMode === side}
                            onChange={() => onSettingsChange({ pawnHideMode: side })}
                            className="h-4 w-4 text-primary focus:ring-primary border-border"
                          />
                          <PieceGlyphs colors={sideSamples[side]} />
                          <span>{t(`game.pieceVisibilityModes.${side}`)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
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
            {showPreview && (
              <div data-tour-id="settings-preview">
                <BoardPreview settings={settings} playerSide={playerSide} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
