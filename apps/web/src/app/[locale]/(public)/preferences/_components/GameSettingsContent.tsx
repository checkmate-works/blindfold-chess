'use client';

import { useEffect, useMemo } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { Side } from '@blindfold-chess/types';

import { BOARD_VISIBILITY_VALUES } from '@/lib/games/board-visibility';

import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { BoardAppearanceContent } from './BoardAppearanceContent';
import { BoardPreview } from './BoardPreview';
import { PreferenceOption } from './PreferenceOption';

const allShapeOptions = ['normal', 'circles-all', 'circles-own', 'circles-opponent'] as const;

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
  compact?: boolean;
};

export function GameSettingsContent({
  settings,
  onSettingsChange,
  playerSide = 'white',
  showPreview = true,
  showBoardAppearance = true,
  showBoardButtonOption = true,
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

  useEffect(() => {
    if (!availableShapeOptions.includes(settings.pieceShapeMode)) {
      onSettingsChange({ pieceShapeMode: 'normal' });
    }
  }, [availableShapeOptions, settings.pieceShapeMode, onSettingsChange]);

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
            <h4 className="text-lg font-semibold text-foreground mb-2">
              {t('game.boardVisibility')}
            </h4>
            <p className="text-sm text-muted-foreground mb-4">
              {t('game.boardVisibilityDescription')}
            </p>
            <div className="inline-flex rounded-md border border-border overflow-hidden">
              {BOARD_VISIBILITY_VALUES.map((value, idx) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onSettingsChange({ boardVisibility: value })}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    settings.boardVisibility === value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card text-foreground hover:bg-muted'
                  } ${idx < BOARD_VISIBILITY_VALUES.length - 1 ? 'border-r border-border' : ''}`}
                >
                  {t(`game.boardVisibilities.${value}`)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Board Appearance */}
        {showBoardAppearance && (
          <>
            <BoardAppearanceContent settings={settings} onSettingsChange={onSettingsChange} />

            {/* Divider */}
            <div className="border-t border-border"></div>
          </>
        )}

        {/* Display Options & Piece Visibility & Appearance — shown whenever
            the board IS surfaced (peek OR always); hidden only when
            boardVisibility is 'never' (pure blindfold, nothing to see). */}
        {settings.boardVisibility !== 'never' && (
          <>
            {/* Display Options */}
            <div>
              <h4 className="text-lg font-semibold text-foreground mb-4">
                {t('game.displayOptions')}
              </h4>
              <div className="space-y-3">
                <PreferenceOption
                  type="checkbox"
                  checked={settings.highlightLastMove}
                  onChange={(e) => onSettingsChange({ highlightLastMove: e.target.checked })}
                  label={t('game.highlightLastMove')}
                />
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-border"></div>

            <div>
              <h4 className="text-lg font-semibold text-foreground mb-4">
                {t('game.pieceVisibility')}
              </h4>
              <div className="space-y-3">
                <PreferenceOption
                  type="checkbox"
                  checked={settings.showOwnPieces}
                  onChange={(e) => onSettingsChange({ showOwnPieces: e.target.checked })}
                  label={t('game.showOwnPieces')}
                />
                <PreferenceOption
                  type="checkbox"
                  checked={settings.showOpponentPieces}
                  onChange={(e) => onSettingsChange({ showOpponentPieces: e.target.checked })}
                  label={t('game.showOpponentPieces')}
                />
              </div>
            </div>

            {/* Divider + Piece Appearance - only when at least one piece type is visible */}
            {(settings.showOwnPieces || settings.showOpponentPieces) && (
              <>
                <div className="border-t border-border"></div>

                {/* Piece Appearance */}
                <div>
                  <h4 className="text-lg font-semibold text-foreground mb-4">
                    {t('game.pieceAppearance')}
                  </h4>

                  {/* Piece Shape */}
                  <div className="mb-6">
                    <h5 className="text-sm font-medium text-muted-foreground mb-3">
                      {t('game.pieceShape')}
                    </h5>
                    <div className="space-y-2">
                      {availableShapeOptions.map((mode) => (
                        <PreferenceOption
                          key={mode}
                          type="radio"
                          name="pieceShapeMode"
                          value={mode}
                          checked={settings.pieceShapeMode === mode}
                          onChange={(e) =>
                            onSettingsChange({
                              pieceShapeMode: e.target.value as typeof mode,
                            })
                          }
                          label={t(`game.pieceShapes.${mode}`)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Piece Colors */}
                  <div>
                    <h5 className="text-sm font-medium text-muted-foreground mb-3">
                      {t('game.pieceColor')}
                    </h5>
                    <div className="space-y-2">
                      {(['normal', 'white-only', 'black-only'] as const).map((colors) => (
                        <PreferenceOption
                          key={colors}
                          type="radio"
                          name="pieceColors"
                          value={colors}
                          checked={settings.pieceColors === colors}
                          onChange={(e) =>
                            onSettingsChange({
                              pieceColors: e.target.value as typeof colors,
                            })
                          }
                          label={t(`game.pieceColors.${colors}`)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Preview */}
            {showPreview && (
              <>
                {/* Divider */}
                <div className="border-t border-border"></div>

                <BoardPreview settings={settings} playerSide={playerSide} />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
