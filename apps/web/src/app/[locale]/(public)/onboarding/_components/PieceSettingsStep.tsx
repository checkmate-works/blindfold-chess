'use client';

import { useEffect, useMemo } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { BoardPreview } from '@/app/[locale]/(public)/preferences/_components/BoardPreview';
import { PreferenceOption } from '@/app/[locale]/(public)/preferences/_components/PreferenceOption';
import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

const allShapeOptions = ['normal', 'circles-all', 'circles-own', 'circles-opponent'] as const;

type Props = {
  showOwnPieces: boolean;
  onChangeShowOwnPieces: (checked: boolean) => void;
  showOpponentPieces: boolean;
  onChangeShowOpponentPieces: (checked: boolean) => void;
  selectedPieceShape: GamePreferences['pieceShapeMode'];
  onSelectPieceShape: (mode: GamePreferences['pieceShapeMode']) => void;
  selectedPieceColors: GamePreferences['pieceColors'];
  onSelectPieceColors: (colors: GamePreferences['pieceColors']) => void;
};

export function PieceSettingsStep({
  showOwnPieces,
  onChangeShowOwnPieces,
  showOpponentPieces,
  onChangeShowOpponentPieces,
  selectedPieceShape,
  onSelectPieceShape,
  selectedPieceColors,
  onSelectPieceColors,
}: Props) {
  const t = useTranslations('onboarding');

  const availableShapeOptions = useMemo(() => {
    return allShapeOptions.filter((mode) => {
      if (mode === 'normal') return true;
      if (mode === 'circles-all') return showOwnPieces && showOpponentPieces;
      if (mode === 'circles-own') return showOwnPieces;
      if (mode === 'circles-opponent') return showOpponentPieces;
      return false;
    });
  }, [showOwnPieces, showOpponentPieces]);

  useEffect(() => {
    if (!availableShapeOptions.includes(selectedPieceShape)) {
      onSelectPieceShape('normal');
    }
  }, [availableShapeOptions, selectedPieceShape, onSelectPieceShape]);

  const previewSettings: GamePreferences = {
    showCoordinates: true,
    highlightLastMove: true,
    boardTheme: 'lichess',
    showOwnPieces,
    showOpponentPieces,
    pieceShapeMode: selectedPieceShape,
    pieceColors: selectedPieceColors,
    moveInputMode: 'button',
    enabledMoveInputModes: ['button'],
    buttonInputPieceLabel: 'icon',
    enableAutoComplete: true,
    showBoardButtonInGame: true,
    peekMode: 'modal',
  };

  const hasPiecesVisible = showOwnPieces || showOpponentPieces;

  return (
    <div className="space-y-5">
      <div className="text-center space-y-2">
        <h2 className="text-lg font-semibold text-foreground">{t('step3.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('step3.description')}</p>
      </div>

      {/* Piece Visibility */}
      <div>
        <h4 className="text-lg font-semibold text-foreground mb-4">
          {t('step3.visibility.title')}
        </h4>
        <div className="space-y-3">
          <PreferenceOption
            type="checkbox"
            checked={showOwnPieces}
            onChange={(e) => onChangeShowOwnPieces(e.target.checked)}
            label={t('step3.visibility.showOwnPieces')}
          />
          <PreferenceOption
            type="checkbox"
            checked={showOpponentPieces}
            onChange={(e) => onChangeShowOpponentPieces(e.target.checked)}
            label={t('step3.visibility.showOpponentPieces')}
          />
        </div>
      </div>

      {/* Divider + Piece Appearance - conditional */}
      {hasPiecesVisible && (
        <>
          <div className="border-t border-border" />

          {/* Piece Appearance */}
          <div>
            <h4 className="text-lg font-semibold text-foreground mb-4">
              {t('step3.appearance.title')}
            </h4>

            {/* Piece Shape */}
            <div className="mb-6">
              <h5 className="text-sm font-medium text-muted-foreground mb-3">
                {t('step3.shape.title')}
              </h5>
              <div className="space-y-2">
                {availableShapeOptions.map((mode) => (
                  <PreferenceOption
                    key={mode}
                    type="radio"
                    name="pieceShapeMode"
                    value={mode}
                    checked={selectedPieceShape === mode}
                    onChange={(e) =>
                      onSelectPieceShape(e.target.value as GamePreferences['pieceShapeMode'])
                    }
                    label={t(`step3.shape.${mode}`)}
                  />
                ))}
              </div>
            </div>

            {/* Piece Color */}
            <div>
              <h5 className="text-sm font-medium text-muted-foreground mb-3">
                {t('step3.color.title')}
              </h5>
              <div className="space-y-2">
                {(['normal', 'white-only', 'black-only'] as const).map((colors) => (
                  <PreferenceOption
                    key={colors}
                    type="radio"
                    name="pieceColors"
                    value={colors}
                    checked={selectedPieceColors === colors}
                    onChange={(e) =>
                      onSelectPieceColors(e.target.value as GamePreferences['pieceColors'])
                    }
                    label={t(`step3.color.${colors}`)}
                  />
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Divider before preview - always */}
      <div className="border-t border-border" />

      {/* Preview - always */}
      <BoardPreview settings={previewSettings} />
    </div>
  );
}
