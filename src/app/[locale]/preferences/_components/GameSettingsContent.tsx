'use client';

import { useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';

import type { Side } from '@/lib/types';

import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import { SimpleChessBoard } from '@/app/[locale]/play/_components/SimpleChessBoard';

interface GameSettingsContentProps {
  settings: GamePreferences;
  onSettingsChange: (updates: Partial<GamePreferences>) => void;
  playerSide?: Side;
  showPreview?: boolean;
  compact?: boolean;
}

export function GameSettingsContent({
  settings,
  onSettingsChange,
  playerSide = 'white',
  showPreview = true,
  compact = false,
}: GameSettingsContentProps) {
  const t = useTranslations('Preferences');
  const [previewPerspective, setPreviewPerspective] = useState<'white' | 'black'>(playerSide);

  // Reset preview perspective when playerSide changes
  useEffect(() => {
    setPreviewPerspective(playerSide);
  }, [playerSide]);

  // Demo position for preview
  const demoFen = 'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';

  const containerClass = compact ? '' : 'bg-card rounded-xl p-6 shadow-sm border border-border';

  return (
    <div className={containerClass}>
      <div className="space-y-8">
        {/* Board Appearance */}
        <div>
          <h4 className="text-lg font-semibold text-foreground mb-4">
            {t('game.boardAppearance')}
          </h4>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.showCoordinates}
                onChange={(e) => onSettingsChange({ showCoordinates: e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-muted-foreground">
                {t('game.showCoordinates')}
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.highlightLastMove}
                onChange={(e) => onSettingsChange({ highlightLastMove: e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-muted-foreground">
                {t('game.highlightLastMove')}
              </span>
            </label>
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
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.showOwnPieces}
                onChange={(e) => onSettingsChange({ showOwnPieces: e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-muted-foreground">{t('game.showOwnPieces')}</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.showOpponentPieces}
                onChange={(e) => onSettingsChange({ showOpponentPieces: e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-muted-foreground">
                {t('game.showOpponentPieces')}
              </span>
            </label>
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
                  <label key={mode} className="flex items-center">
                    <input
                      type="radio"
                      name="pieceShapeMode"
                      value={mode}
                      checked={settings.pieceShapeMode === mode}
                      onChange={(e) =>
                        onSettingsChange({
                          pieceShapeMode: e.target.value as typeof mode,
                        })
                      }
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-muted-foreground">
                      {t(`game.pieceShapes.${mode}`)}
                    </span>
                  </label>
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
                <label key={colors} className="flex items-center">
                  <input
                    type="radio"
                    name="pieceColors"
                    value={colors}
                    checked={settings.pieceColors === colors}
                    onChange={(e) =>
                      onSettingsChange({
                        pieceColors: e.target.value as typeof colors,
                      })
                    }
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-muted-foreground">
                    {t(`game.pieceColors.${colors}`)}
                  </span>
                </label>
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
                <div className="inline-flex rounded-lg bg-muted p-1">
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
                  <SimpleChessBoard
                    fen={demoFen}
                    flipped={previewPerspective === 'black'}
                    playerSide={previewPerspective}
                    showCoordinates={settings.showCoordinates}
                    showOwnPieces={settings.showOwnPieces}
                    showOpponentPieces={settings.showOpponentPieces}
                    pieceShapeMode={settings.pieceShapeMode}
                    pieceColors={settings.pieceColors}
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
