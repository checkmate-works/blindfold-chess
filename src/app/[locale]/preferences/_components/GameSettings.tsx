'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useGamePreferences } from '../../_contexts/GamePreferencesContext';
import { SimpleChessBoard } from '../../play/_components/SimpleChessBoard';

export function GameSettings() {
  const t = useTranslations('Preferences');
  const { preferences, updatePreferences, resetPreferences } = useGamePreferences();
  const [previewPerspective, setPreviewPerspective] = useState<'white' | 'black'>('white');

  // Demo position for preview
  const demoFen = 'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';

  return (
    <div className="max-w-4xl">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {t('game.title')}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-8">{t('game.description')}</p>

        {/* All settings in one container */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="space-y-8">
            {/* Board Appearance */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('game.boardAppearance')}
              </h4>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={preferences.showCoordinates}
                    onChange={(e) => updatePreferences({ showCoordinates: e.target.checked })}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    {t('game.showCoordinates')}
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={preferences.highlightLastMove}
                    onChange={(e) => updatePreferences({ highlightLastMove: e.target.checked })}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    {t('game.highlightLastMove')}
                  </span>
                </label>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200 dark:border-gray-700"></div>

            {/* Piece Visibility */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('game.pieceVisibility')}
              </h4>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={preferences.showOwnPieces}
                    onChange={(e) => updatePreferences({ showOwnPieces: e.target.checked })}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    {t('game.showOwnPieces')}
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={preferences.showOpponentPieces}
                    onChange={(e) => updatePreferences({ showOpponentPieces: e.target.checked })}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    {t('game.showOpponentPieces')}
                  </span>
                </label>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200 dark:border-gray-700"></div>

            {/* Piece Appearance */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('game.pieceAppearance')}
              </h4>

              {/* Piece Shape */}
              <div className="mb-6">
                <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
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
                          checked={preferences.pieceShapeMode === mode}
                          onChange={(e) =>
                            updatePreferences({
                              pieceShapeMode: e.target.value as
                                | 'normal'
                                | 'circles-all'
                                | 'circles-own'
                                | 'circles-opponent',
                            })
                          }
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                          {t(`game.pieceShapes.${mode}`)}
                        </span>
                      </label>
                    )
                  )}
                </div>
              </div>

              {/* Piece Colors */}
              <div>
                <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  {t('game.pieceColor')}
                </h5>
                <div className="space-y-2">
                  {(['normal', 'white-only', 'black-only'] as const).map((colors) => (
                    <label key={colors} className="flex items-center">
                      <input
                        type="radio"
                        name="pieceColors"
                        value={colors}
                        checked={preferences.pieceColors === colors}
                        onChange={(e) =>
                          updatePreferences({
                            pieceColors: e.target.value as 'normal' | 'white-only' | 'black-only',
                          })
                        }
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        {t(`game.pieceColors.${colors}`)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200 dark:border-gray-700"></div>

            {/* Preview */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 text-center">
                {t('game.preview.title')}
              </h4>

              {/* Perspective toggle */}
              <div className="flex justify-center mb-4">
                <div className="inline-flex rounded-lg bg-gray-100 dark:bg-gray-700 p-1">
                  <button
                    onClick={() => setPreviewPerspective('white')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      previewPerspective === 'white'
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {t('game.preview.whiteView')}
                  </button>
                  <button
                    onClick={() => setPreviewPerspective('black')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      previewPerspective === 'black'
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
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
                    showCoordinates={preferences.showCoordinates}
                    showOwnPieces={preferences.showOwnPieces}
                    showOpponentPieces={preferences.showOpponentPieces}
                    pieceShapeMode={preferences.pieceShapeMode}
                    pieceColors={preferences.pieceColors}
                    className="w-full h-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reset Button */}
        <div className="mt-8">
          <button
            onClick={resetPreferences}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-md transition-colors"
          >
            {t('game.resetDefaults')}
          </button>
        </div>
      </div>
    </div>
  );
}
