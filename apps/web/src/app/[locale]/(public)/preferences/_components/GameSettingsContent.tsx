'use client';

import { useEffect, useMemo } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { Side } from '@blindfold-chess/types';

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

  const containerClass = compact ? '' : 'bg-card rounded-md p-6 shadow-sm border border-border';

  return (
    <div className={containerClass}>
      <div className="space-y-8">
        {/* Show Board Button Option */}
        {showBoardButtonOption && (
          <>
            <div>
              <div className="space-y-3">
                <PreferenceOption
                  type="checkbox"
                  checked={settings.showBoardButtonInGame}
                  onChange={(e) => onSettingsChange({ showBoardButtonInGame: e.target.checked })}
                  label={t('game.showBoardButtonInGame')}
                />
              </div>
            </div>
          </>
        )}

        {/* Board Appearance */}
        {showBoardAppearance && (
          <>
            <BoardAppearanceContent settings={settings} onSettingsChange={onSettingsChange} />

            {/* Divider */}
            <div className="border-t border-border"></div>
          </>
        )}

        {/* Display Options & Piece Visibility & Appearance (hidden when showBoardButtonInGame is off) */}
        {settings.showBoardButtonInGame && (
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
