'use client';

import { useTranslations } from 'next-intl';

import type { AlgebraicNotation } from '@blindfold-chess/types';
import { FaTrash } from 'react-icons/fa';

import { CoordinateInput } from '@/app/[locale]/_components/CoordinateInput';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { CastlingSelector } from './CastlingSelector';
import { PieceSelector } from './PieceSelector';
import { PromotionSelector } from './PromotionSelector';
import { useButtonInputLogic } from './useButtonInputLogic';

type Props = {
  fen: string;
  onSubmit: (move: AlgebraicNotation) => void;
  disabled?: boolean;
  playerColor?: 'w' | 'b';
};

export function ButtonInput({ fen, onSubmit, disabled = false, playerColor = 'w' }: Props) {
  const t = useTranslations('ButtonInput');
  const { preferences } = useGamePreferences();
  const { buttonInputPieceLabel } = preferences;

  const {
    selectedPiece,
    selectedFiles,
    selectedRanks,
    targetFile,
    isCapture,
    isCheck,
    castling,
    promotionPiece,
    showPromotion,
    isPawnCaptureMode,
    previewText,
    handlePieceClick,
    handleFileClick,
    handleCastlingClick,
    toggleSelectionRanks,
    setTargetFile,
    setIsCapture,
    setIsCheck,
    setPromotionPiece,
    resetSelections,
    handleSubmit,
    sourceFile,
    sourceRank,
    isAmbiguous,
    setSourceFile,
    setSourceRank,
    setIsAmbiguous,
  } = useButtonInputLogic({ fen, onSubmit });

  return (
    <div className="flex flex-col gap-3 p-4 bg-card rounded-lg">
      {/* Piece Row */}
      {!castling && (selectedFiles.size === 0 || selectedPiece) && (
        <PieceSelector
          selectedPiece={selectedPiece}
          playerColor={playerColor}
          pieceLabel={buttonInputPieceLabel}
          onPieceClick={handlePieceClick}
        />
      )}

      {/* Castling Row */}
      {!selectedPiece && selectedFiles.size === 0 && (
        <CastlingSelector castling={castling} onCastlingClick={handleCastlingClick} />
      )}

      {/* Takes Checkbox (Piece Mode) - Shown below PieceRow if Piece is selected */}
      {selectedPiece && (
        <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Disambiguation Toggle */}
          <div className="flex justify-center">
            <button
              onClick={() => setIsAmbiguous(!isAmbiguous)}
              className={`px-3 py-1 rounded text-sm font-bold transition-colors border ${
                isAmbiguous
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'hover:bg-muted border-transparent hover:border-border text-muted-foreground'
              }`}
            >
              {t('disambiguationButton')}
            </button>
          </div>

          {/* Disambiguation Panel */}
          {isAmbiguous && (
            <div className="p-3 bg-muted/30 rounded border border-border flex flex-col gap-2">
              <div className="text-xs font-bold text-muted-foreground text-center uppercase">
                {t('sourceLabel')}
              </div>
              {/* Source File */}
              <div className="flex gap-1 justify-center w-full">
                {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((file) => (
                  <button
                    key={`source-file-${file}`}
                    onClick={() => setSourceFile(sourceFile === file ? null : file)}
                    className={`flex-1 min-w-0 h-6 rounded-md font-mono text-sm transition-colors border ${
                      sourceFile === file
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-muted border-border'
                    }`}
                  >
                    {file}
                  </button>
                ))}
              </div>
              {/* Source Rank */}
              <div className="flex gap-1 justify-center w-full">
                {['1', '2', '3', '4', '5', '6', '7', '8'].map((rank) => (
                  <button
                    key={`source-rank-${rank}`}
                    onClick={() => setSourceRank(sourceRank === rank ? null : rank)}
                    className={`flex-1 min-w-0 h-6 rounded-md font-mono text-sm transition-colors border ${
                      sourceRank === rank
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-muted border-border'
                    }`}
                  >
                    {rank}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Capture Toggle */}
          <div className="flex justify-center">
            <label
              className={`flex items-center gap-2 cursor-pointer select-none px-4 py-2 rounded-full transition-colors border ${
                isCapture
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'hover:bg-muted border-transparent hover:border-border'
              }`}
            >
              <input
                type="checkbox"
                checked={isCapture}
                onChange={() => setIsCapture(!isCapture)}
                className="w-5 h-5 rounded border-border text-primary focus:ring-primary accent-primary"
              />
              <span className="font-mono font-bold text-lg">x</span>
            </label>
          </div>
        </div>
      )}

      {!castling && (
        <>
          {/* Source Files Row */}
          <div className="flex flex-col gap-2">
            <CoordinateInput
              selectedFiles={selectedFiles}
              onFileToggle={handleFileClick}
              showRanks={false}
            />

            {/* Takes Checkbox (Pawn Mode) - Shown if no piece selected and file selected */}
            {!selectedPiece && selectedFiles.size > 0 && (
              <div className="flex justify-center animate-in fade-in slide-in-from-top-2 duration-200">
                <label
                  className={`flex items-center gap-2 cursor-pointer select-none px-4 py-2 rounded-full transition-colors border ${
                    isCapture
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'hover:bg-muted border-transparent hover:border-border'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isCapture}
                    onChange={() => setIsCapture(!isCapture)}
                    className="w-5 h-5 rounded border-border text-primary focus:ring-primary accent-primary"
                  />
                  <span className="font-mono font-bold text-lg">x</span>
                </label>
              </div>
            )}

            {/* Target File Row (Pawn Capture Mode Only) */}
            {isPawnCaptureMode && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                <CoordinateInput
                  selectedFiles={targetFile ? new Set([targetFile]) : new Set()}
                  onFileToggle={(file) => setTargetFile(targetFile === file ? null : file)}
                  showRanks={false}
                  disabledFile={(file) => selectedFiles.has(file)}
                />
              </div>
            )}
          </div>

          {/* Ranks Row (1 to 8) - Show only if File is selected (and Target File if capture) */}
          {selectedFiles.size > 0 && (!isPawnCaptureMode || targetFile) && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <CoordinateInput
                selectedRanks={selectedRanks}
                onRankToggle={toggleSelectionRanks}
                showFiles={false}
              />
            </div>
          )}

          {/* Promotion Selector (Conditional) */}
          {showPromotion && (
            <PromotionSelector
              promotionPiece={promotionPiece}
              onPromotionPieceChange={setPromotionPiece}
            />
          )}

          {/* Modifiers (Check) - Only show when rank is selected (completed move) AND (not promotion mode OR promotion piece selected) */}
          {selectedRanks.size > 0 && (!showPromotion || promotionPiece) && (
            <div className="flex justify-center animate-in fade-in slide-in-from-top-2 duration-200 mt-1">
              <label
                className={`flex items-center gap-2 cursor-pointer select-none px-4 py-2 rounded-full transition-colors border ${
                  isCheck
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'hover:bg-muted border-transparent hover:border-border'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isCheck}
                  onChange={() => setIsCheck(!isCheck)}
                  className="w-5 h-5 rounded border-border text-primary focus:ring-primary accent-primary"
                />
                <span className="font-mono font-bold text-lg">+</span>
              </label>
            </div>
          )}
        </>
      )}

      {/* Actions (Input-like style) */}
      <div className="flex gap-2 mt-2 items-center">
        <div className="flex-1 relative">
          <div className="w-full px-4 py-3 border rounded-lg bg-background font-mono text-lg h-14 flex items-center border-border">
            <span className="font-bold text-foreground">{previewText}</span>
          </div>

          {/* Clear Button (Absolute right of input) */}
          {(selectedPiece ||
            selectedFiles.size > 0 ||
            selectedRanks.size > 0 ||
            isCapture ||
            isCheck ||
            castling ||
            sourceFile ||
            sourceRank) && (
            <button
              onClick={resetSelections}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
              title="Clear"
            >
              <FaTrash className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={disabled || !previewText}
          className="w-14 h-14 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:shadow-none disabled:text-muted-foreground disabled:cursor-not-allowed text-primary-foreground font-medium rounded-lg transition-all duration-150 flex items-center justify-center text-xl border border-border"
          title="Submit"
        >
          ♟️
        </button>
      </div>
    </div>
  );
}
