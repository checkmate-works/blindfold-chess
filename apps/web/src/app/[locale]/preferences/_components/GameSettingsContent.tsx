'use client';

import { useTranslations } from 'next-intl';

import type { Side } from '@blindfold-chess/types';

import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { BoardAppearanceContent } from './BoardAppearanceContent';
import { BoardPreview } from './BoardPreview';
import { PreferenceOption } from './PreferenceOption';

type Props = {
  settings: GamePreferences;
  onSettingsChange: (updates: Partial<GamePreferences>) => void;
  playerSide?: Side;
  showPreview?: boolean;
  showBoardAppearance?: boolean;
  compact?: boolean;
};

export function GameSettingsContent({
  settings,
  onSettingsChange,
  playerSide = 'white',
  showPreview = true,
  showBoardAppearance = true,
  compact = false,
}: Props) {
  const t = useTranslations('Preferences');

  const containerClass = compact ? '' : 'bg-card rounded-md p-6 shadow-sm border border-border';

  return (
    <div className={containerClass}>
      <div className="space-y-8">
        {/* Board Appearance */}
        {showBoardAppearance && (
          <>
            <BoardAppearanceContent settings={settings} onSettingsChange={onSettingsChange} />

            {/* Divider */}
            <div className="border-t border-border"></div>
          </>
        )}

        {/* Piece Visibility */}
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

        {/* Divider */}
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
              {(['normal', 'circles-all', 'circles-own', 'circles-opponent'] as const).map(
                (mode) => (
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
                )
              )}
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

        {/* Preview */}
        {showPreview && (
          <>
            {/* Divider */}
            <div className="border-t border-border"></div>

            <BoardPreview settings={settings} playerSide={playerSide} />
          </>
        )}
      </div>
    </div>
  );
}
