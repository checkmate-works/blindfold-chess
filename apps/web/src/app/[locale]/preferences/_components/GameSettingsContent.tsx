'use client';

import { useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';

import { ChessBoard } from '@/app/_components';
import type { Side } from '@blindfold-chess/core';

import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { PreferenceOption } from './PreferenceOption';

type Props = {
  settings: GamePreferences;
  onSettingsChange: (updates: Partial<GamePreferences>) => void;
  playerSide?: Side;
  showPreview?: boolean;
  compact?: boolean;
};

export function GameSettingsContent({
  settings,
  onSettingsChange,
  playerSide = 'white',
  showPreview = true,
  compact = false,
}: Props) {
  const t = useTranslations('Preferences');
  const [previewPerspective, setPreviewPerspective] = useState<'white' | 'black'>(playerSide);

  // Reset preview perspective when playerSide changes
  useEffect(() => {
    setPreviewPerspective(playerSide);
  }, [playerSide]);

  // Demo position for preview
  const demoFen = 'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';

  const containerClass = compact ? '' : 'bg-card rounded-md p-6 shadow-sm border border-border';

  return (
    <div className={containerClass}>
      <div className="space-y-8">
        {/* Board Appearance */}
        <div>
          <h4 className="text-lg font-semibold text-foreground mb-4">
            {t('game.boardAppearance')}
          </h4>

          {/* Board Theme */}
          <div className="mb-6">
            <h5 className="text-sm font-medium text-muted-foreground mb-3">
              {t('game.boardTheme')}
            </h5>
            <div className="space-y-2">
              {(['default', 'lichess', 'chesscom'] as const).map((theme) => (
                <PreferenceOption
                  key={theme}
                  type="radio"
                  name="boardTheme"
                  value={theme}
                  checked={settings.boardTheme === theme}
                  onChange={(e) =>
                    onSettingsChange({
                      boardTheme: e.target.value as typeof theme,
                    })
                  }
                  label={t(`game.boardThemes.${theme}`)}
                />
              ))}
            </div>
          </div>

          {/* Board Display Options */}
          <div>
            <h5 className="text-sm font-medium text-muted-foreground mb-3">
              {t('game.displayOptions')}
            </h5>
            <div className="space-y-3">
              <PreferenceOption
                type="checkbox"
                checked={settings.showCoordinates}
                onChange={(e) => onSettingsChange({ showCoordinates: e.target.checked })}
                label={t('game.showCoordinates')}
              />
              <PreferenceOption
                type="checkbox"
                checked={settings.highlightLastMove}
                onChange={(e) => onSettingsChange({ highlightLastMove: e.target.checked })}
                label={t('game.highlightLastMove')}
              />
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border"></div>

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

            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-4 text-center">
                {t('game.preview.title')}
              </h4>

              {/* Perspective toggle */}
              <div className="flex justify-center mb-4">
                <div className="inline-flex rounded-md bg-muted p-1">
                  <button
                    onClick={() => setPreviewPerspective('white')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      previewPerspective === 'white'
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t('game.preview.whiteView')}
                  </button>
                  <button
                    onClick={() => setPreviewPerspective('black')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      previewPerspective === 'black'
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t('game.preview.blackView')}
                  </button>
                </div>
              </div>

              <div className="flex justify-center">
                <div className="w-full max-w-[90vw] sm:max-w-[280px] aspect-square">
                  <ChessBoard
                    fen={demoFen}
                    flipped={previewPerspective === 'black'}
                    playerSide={previewPerspective}
                    showCoordinates={settings.showCoordinates}
                    showOwnPieces={settings.showOwnPieces}
                    showOpponentPieces={settings.showOpponentPieces}
                    pieceShapeMode={settings.pieceShapeMode}
                    pieceColors={settings.pieceColors}
                    boardTheme={settings.boardTheme}
                    className="w-full h-full"
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
