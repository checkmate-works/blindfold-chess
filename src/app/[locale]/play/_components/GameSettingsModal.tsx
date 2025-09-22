'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Modal } from '../../_components/Modal';
import { SimpleChessBoard } from './SimpleChessBoard';
import { useGamePreferences } from '../../_contexts/GamePreferencesContext';
import type { Side } from '../_lib/types';

interface GameSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerSide?: Side;
}

export function GameSettingsModal({
  isOpen,
  onClose,
  playerSide = 'white',
}: GameSettingsModalProps) {
  const t = useTranslations('play');
  const tPrefs = useTranslations('Preferences');
  const { preferences, updatePreferences } = useGamePreferences();

  // Temporary settings state for preview
  const [tempSettings, setTempSettings] = useState(preferences);
  const [previewPerspective, setPreviewPerspective] = useState<'white' | 'black'>(playerSide);

  // Reset temp settings when modal opens
  useEffect(() => {
    if (isOpen) {
      setTempSettings(preferences);
    }
  }, [isOpen, preferences]);

  // Demo position for preview
  const demoFen = 'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';

  const handleSave = () => {
    updatePreferences(tempSettings);
    onClose();
  };

  const handleCancel = () => {
    setTempSettings(preferences);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      title={t('configureBoardAppearance')}
      onClose={handleCancel}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-8">
        {/* Board Appearance */}
        <div>
          <h4 className="text-lg font-semibold text-foreground mb-4">
            {tPrefs('game.boardAppearance')}
          </h4>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={tempSettings.showCoordinates}
                onChange={(e) =>
                  setTempSettings({ ...tempSettings, showCoordinates: e.target.checked })
                }
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-muted-foreground">
                {tPrefs('game.showCoordinates')}
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={tempSettings.highlightLastMove}
                onChange={(e) =>
                  setTempSettings({ ...tempSettings, highlightLastMove: e.target.checked })
                }
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-muted-foreground">
                {tPrefs('game.highlightLastMove')}
              </span>
            </label>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border"></div>

        {/* Piece Visibility */}
        <div>
          <h4 className="text-lg font-semibold text-foreground mb-4">
            {tPrefs('game.pieceVisibility')}
          </h4>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={tempSettings.showOwnPieces}
                onChange={(e) =>
                  setTempSettings({ ...tempSettings, showOwnPieces: e.target.checked })
                }
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-muted-foreground">
                {tPrefs('game.showOwnPieces')}
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={tempSettings.showOpponentPieces}
                onChange={(e) =>
                  setTempSettings({ ...tempSettings, showOpponentPieces: e.target.checked })
                }
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-muted-foreground">
                {tPrefs('game.showOpponentPieces')}
              </span>
            </label>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border"></div>

        {/* Piece Appearance */}
        <div>
          <h4 className="text-lg font-semibold text-foreground mb-4">
            {tPrefs('game.pieceAppearance')}
          </h4>

          {/* Piece Shape */}
          <div className="mb-6">
            <h5 className="text-sm font-medium text-muted-foreground mb-3">
              {tPrefs('game.pieceShape')}
            </h5>
            <div className="space-y-2">
              {(['normal', 'circles-all', 'circles-own', 'circles-opponent'] as const).map(
                (mode) => (
                  <label key={mode} className="flex items-center">
                    <input
                      type="radio"
                      name="pieceShapeMode"
                      value={mode}
                      checked={tempSettings.pieceShapeMode === mode}
                      onChange={(e) =>
                        setTempSettings({
                          ...tempSettings,
                          pieceShapeMode: e.target.value as typeof mode,
                        })
                      }
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-muted-foreground">
                      {tPrefs(`game.pieceShapes.${mode}`)}
                    </span>
                  </label>
                )
              )}
            </div>
          </div>

          {/* Piece Colors */}
          <div>
            <h5 className="text-sm font-medium text-muted-foreground mb-3">
              {tPrefs('game.pieceColor')}
            </h5>
            <div className="space-y-2">
              {(['normal', 'white-only', 'black-only'] as const).map((colors) => (
                <label key={colors} className="flex items-center">
                  <input
                    type="radio"
                    name="pieceColors"
                    value={colors}
                    checked={tempSettings.pieceColors === colors}
                    onChange={(e) =>
                      setTempSettings({
                        ...tempSettings,
                        pieceColors: e.target.value as typeof colors,
                      })
                    }
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-muted-foreground">
                    {tPrefs(`game.pieceColors.${colors}`)}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border"></div>

        {/* Preview */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-4 text-center">
            {tPrefs('game.preview.title')}
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
                {tPrefs('game.preview.whiteView')}
              </button>
              <button
                onClick={() => setPreviewPerspective('black')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  previewPerspective === 'black'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tPrefs('game.preview.blackView')}
              </button>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="w-full max-w-[90vw] sm:max-w-[280px] aspect-square">
              <SimpleChessBoard
                fen={demoFen}
                flipped={previewPerspective === 'black'}
                playerSide={previewPerspective}
                showCoordinates={tempSettings.showCoordinates}
                showOwnPieces={tempSettings.showOwnPieces}
                showOpponentPieces={tempSettings.showOpponentPieces}
                pieceShapeMode={tempSettings.pieceShapeMode}
                pieceColors={tempSettings.pieceColors}
                className="w-full h-full"
              />
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex justify-center pt-4 border-t border-border space-x-4">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-md hover:bg-muted"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-background bg-foreground rounded-md hover:bg-foreground/90"
          >
            {t('save')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
