'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { Button, ProgressBar } from '@/app/_components';
import { FaCheck, FaEye, FaInfoCircle, FaQuestionCircle, FaSpinner } from 'react-icons/fa';

import { BoardViewModal } from '@/app/[locale]/(public)/games/play/_components/BoardViewModal';
import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import { MoveInputPanel } from '@/app/[locale]/_components/MoveInputPanel';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import type { SelectedMoveDisplay } from '../_hooks';
import { usePostmortemGame } from '../_hooks';
import { EvaluationInfoModal } from './EvaluationInfoModal';
import { MoveFilterModal } from './MoveFilterModal';
import { PostmortemMoveLog } from './PostmortemMoveLog';
import { PostmortemMovesPanel } from './PostmortemMovesPanel';

type Props = {
  pgn: string;
  playerColor: 'white' | 'black';
  autoOpponent: boolean;
  initialOffset?: number;
  startingFen?: string;
  onSelectedMoveChange?: (moveDisplay: SelectedMoveDisplay | null) => void;
};

export function PostmortemClient({
  pgn,
  playerColor,
  autoOpponent: initialAutoOpponent,
  initialOffset = 0,
  startingFen,
  onSelectedMoveChange,
}: Props) {
  const t = useTranslations('postmortem');
  const { preferences, updatePreferences } = useGamePreferences();

  const {
    gameProgress,
    boardState,
    moveInput,
    moveLog,
    settings,
    navigation,
    filters,
    actions,
    formattedPgn,
  } = usePostmortemGame({
    pgn,
    playerColor,
    autoOpponent: initialAutoOpponent,
    initialOffset,
    startingFen,
    onSelectedMoveChange,
  });

  // UI-only state (modal visibility)
  const [isBoardVisible, setIsBoardVisible] = useState(false);
  const [showEvalInfo, setShowEvalInfo] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showAnalyzeAllConfirm, setShowAnalyzeAllConfirm] = useState(false);

  const { currentFen, displayFen, currentLastMove, currentEvaluationMark } = boardState;
  const { isCompleted, totalMoves, progress, originalMoves } = gameProgress;

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Progress Bar, Input, Actions */}
        <div className="lg:col-span-2">
          <div className="bg-card rounded-lg shadow-lg p-4">
            <div className="flex flex-col gap-6">
              {/* Progress Bar */}
              <ProgressBar current={progress} total={totalMoves} />

              {!isCompleted ? (
                <>
                  {/* Loading indicator during "Analyze All" */}
                  {moveInput.isAnalyzingAll ? (
                    <div className="py-8 text-center">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <FaSpinner className="w-4 h-4 animate-spin" />
                        <span className="text-sm">{t('analyzing')}</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Loading indicator during single move evaluation */}
                      {moveInput.isEvaluating && (
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-2 text-muted-foreground">
                            <FaSpinner className="w-4 h-4 animate-spin" />
                            <span className="text-sm">{t('analyzing')}</span>
                          </div>
                        </div>
                      )}

                      {/* Move Input */}
                      <MoveInputPanel
                        preferences={preferences}
                        updatePreferences={updatePreferences}
                        currentFen={displayFen || currentFen}
                        moveInput={moveInput.value}
                        onMoveInputChange={moveInput.setValue}
                        error={null}
                        onErrorClear={() => {}}
                        onSubmit={actions.handleSubmitMove}
                        disabled={moveInput.isEvaluating}
                        inputPlaceholder={t('inputMove')}
                        selectPlaceholder={t('selectMove')}
                        toggleTitle={t('switchInputMode')}
                        playerColor={currentFen.split(' ')[1] === 'b' ? 'b' : 'w'}
                      />

                      {/* Action Buttons */}
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => setIsBoardVisible(true)}
                          className="px-4 py-2 border border-border rounded-md hover:bg-muted flex items-center justify-center gap-2"
                          title={t('showBoard')}
                        >
                          <FaEye className="w-4 h-4" />
                          <span className="hidden md:inline">{t('showBoard')}</span>
                        </button>
                        <Button
                          variant="secondary"
                          onClick={actions.handleDontKnow}
                          icon={<FaQuestionCircle className="w-4 h-4" />}
                          disabled={moveInput.isEvaluating}
                          className="px-4 py-2"
                        >
                          <span className={settings.dontKnowCount >= 2 ? 'hidden md:inline' : ''}>
                            {t('dontKnow')}
                          </span>
                        </Button>
                        {settings.dontKnowCount >= 2 && (
                          <button
                            onClick={() => setShowAnalyzeAllConfirm(true)}
                            disabled={moveInput.isEvaluating}
                            className="px-4 py-2 border border-border rounded-md hover:bg-muted disabled:opacity-50 flex items-center gap-2"
                          >
                            <FaCheck className="w-4 h-4" />
                            {settings.showEvaluation ? t('analyzeAll') : t('autoFillAll')}
                          </button>
                        )}
                      </div>

                      {/* Settings checkboxes */}
                      <div className="flex flex-col gap-2">
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.autoOpponent}
                            onChange={(e) => settings.setAutoOpponent(e.target.checked)}
                            className="w-4 h-4 rounded border-border"
                          />
                          <span className="text-sm text-muted-foreground">
                            {t('autoOpponentMoves')}
                          </span>
                        </label>
                        <div className="inline-flex items-center gap-2">
                          <label className="inline-flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={settings.showEvaluation}
                              onChange={(e) => settings.setShowEvaluation(e.target.checked)}
                              className="w-4 h-4 rounded border-border"
                            />
                            <span className="text-sm text-muted-foreground">
                              {t('showEvaluation')}
                            </span>
                          </label>
                          <button
                            onClick={() => setShowEvalInfo(true)}
                            className="text-muted-foreground hover:text-foreground transition-colors p-1"
                            aria-label="Evaluation information"
                          >
                            <FaInfoCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Move Log */}
                      <PostmortemMoveLog entries={moveLog.entries} mode="playing" />
                    </>
                  )}
                </>
              ) : (
                /* Completion Message */
                <>
                  <div className="py-8 text-center flex flex-col items-center gap-4">
                    <FaCheck className="w-12 h-12 text-success" />
                    <div className="flex flex-col gap-2">
                      <h3 className="text-xl font-bold">{t('completed')}</h3>
                      <p className="text-muted-foreground">
                        {navigation.selectedMoveIndex !== null ? (
                          <button
                            onClick={() => navigation.setSelectedMoveIndex(null)}
                            className="text-sm underline hover:text-foreground"
                          >
                            {t('backToCurrentPosition')}
                          </button>
                        ) : (
                          t('completedMessage')
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Show Board Button */}
                  <div className="flex justify-center">
                    <button
                      onClick={() => setIsBoardVisible(true)}
                      className="px-4 py-2 border border-border rounded-md hover:bg-muted flex items-center justify-center gap-2"
                      title={t('showBoard')}
                    >
                      <FaEye className="w-4 h-4" />
                      <span>{t('showBoard')}</span>
                    </button>
                  </div>

                  {/* Move Log - also show when completed */}
                  <PostmortemMoveLog
                    entries={moveLog.filteredEntries}
                    mode="completed"
                    onFilterClick={() => setShowFilterModal(true)}
                    onMoveClick={actions.handleMoveClick}
                  />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Move List */}
        <PostmortemMovesPanel
          formattedPgn={formattedPgn}
          currentPosition={navigation.currentPosition}
          originalMovesLength={originalMoves.length}
          currentFen={currentFen}
          displayFen={displayFen}
          startingFen={startingFen}
          onNavigateToPosition={navigation.navigateToPosition}
          onNavigateToStart={navigation.navigateToStart}
          onNavigatePrevious={navigation.navigatePrevious}
          onNavigateNext={navigation.navigateNext}
          onNavigateToEnd={navigation.navigateToEnd}
        />
      </div>

      {/* Evaluation Info Modal */}
      <EvaluationInfoModal isOpen={showEvalInfo} onClose={() => setShowEvalInfo(false)} />

      {/* Filter Modal */}
      <MoveFilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filters={filters.value}
        onFiltersChange={filters.setValue}
        onReset={filters.reset}
        hasAnyEvaluation={moveLog.hasAnyEvaluation}
      />

      {/* Analyze All Confirmation Modal */}
      <ConfirmationModal
        isOpen={showAnalyzeAllConfirm}
        onCancel={() => setShowAnalyzeAllConfirm(false)}
        onConfirm={() => {
          setShowAnalyzeAllConfirm(false);
          actions.handleAnalyzeAll();
        }}
        title={settings.showEvaluation ? t('confirmAnalyzeAllTitle') : t('confirmAutoFillAllTitle')}
        message={
          settings.showEvaluation ? t('confirmAnalyzeAllMessage') : t('confirmAutoFillAllMessage')
        }
        confirmText={settings.showEvaluation ? t('analyzeAll') : t('autoFillAll')}
        cancelText={t('cancel')}
      />

      {/* Board View Modal */}
      <BoardViewModal
        isOpen={isBoardVisible}
        onClose={() => setIsBoardVisible(false)}
        fen={displayFen || currentFen}
        playerSide={playerColor}
        lastMove={preferences.highlightLastMove ? currentLastMove : null}
        preferences={preferences}
        movesLength={originalMoves.length}
        currentPosition={navigation.currentPosition}
        formattedPgn={formattedPgn}
        evaluationMark={currentEvaluationMark}
        onNavigateToStart={navigation.navigateToStart}
        onNavigatePrevious={navigation.navigatePrevious}
        onNavigateNext={navigation.navigateNext}
        onNavigateToEnd={navigation.navigateToEnd}
        onNavigateToPosition={navigation.navigateToPosition}
      />
    </div>
  );
}
