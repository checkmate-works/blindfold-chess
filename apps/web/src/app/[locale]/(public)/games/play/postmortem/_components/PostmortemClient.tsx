'use client';

import { useEffect, useState } from 'react';

import { Button, ProgressBar } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaCheck, FaEye, FaQuestionCircle, FaSpinner } from 'react-icons/fa';

import { BoardViewModal } from '@/app/[locale]/(public)/games/play/_components/BoardViewModal';
import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import { Modal } from '@/app/[locale]/_components/Modal';
import { MoveInputPanel } from '@/app/[locale]/_components/MoveInputPanel';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import { TEXT_LINK_MUTED_CLASSES } from '@/app/[locale]/_lib/link-classes';

import { usePostmortemGame } from '../_hooks';
import { PostmortemMovesPanel } from './PostmortemMovesPanel';

type Props = {
  pgn: string;
  playerColor: 'white' | 'black';
  autoOpponent: boolean;
  initialOffset?: number;
  startingFen?: string;
  onStart?: () => void;
};

export function PostmortemClient({
  pgn,
  playerColor,
  autoOpponent: initialAutoOpponent,
  initialOffset = 0,
  startingFen,
  onStart,
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
    actions,
    formattedPgn,
  } = usePostmortemGame({
    pgn,
    playerColor,
    autoOpponent: initialAutoOpponent,
    initialOffset,
    startingFen,
  });

  // UI-only state (modal visibility)
  const [isBoardVisible, setIsBoardVisible] = useState(false);
  const [showMoveLogModal, setShowMoveLogModal] = useState(false);
  const [showAnalyzeAllConfirm, setShowAnalyzeAllConfirm] = useState(false);

  const { currentFen, displayFen, currentLastMove, currentEvaluationMark } = boardState;
  const { isCompleted, totalMoves, progress, originalMoves } = gameProgress;

  // Format feedback message from structured data
  const feedback = moveInput.lastFeedback;
  const movePrefix = feedback
    ? feedback.isWhiteMove
      ? `${feedback.moveNumber}.`
      : `${feedback.moveNumber}...`
    : '';
  const feedbackMessage = feedback
    ? feedback.type === 'incorrect'
      ? t('incorrectMoveError', { movePrefix, move: feedback.move })
      : feedback.type === 'skipped'
        ? t('skippedMoveMessage', { movePrefix, move: feedback.move })
        : t('correctMoveMessage', { movePrefix, move: feedback.move })
    : null;
  const feedbackIsError = feedback?.type === 'incorrect';

  useEffect(() => {
    if (progress > 0) {
      onStart?.();
    }
  }, [progress, onStart]);

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Progress Bar, Input, Actions */}
        <div className="lg:col-span-2">
          <div className="border border-border rounded-lg p-4">
            <div className="flex flex-col gap-6">
              {/* Description & Guidance (shown only before first move) */}
              {progress === 0 && (
                <div className="rounded-lg bg-amber-50 p-4 dark:bg-amber-950/20">
                  <p className="text-sm text-muted-foreground">{t('description')}</p>
                  <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1 mt-3">
                    <li>{t('guidanceStep1')}</li>
                    <li>{t('guidanceStep2')}</li>
                    <li>{t('guidanceStep3')}</li>
                  </ol>
                </div>
              )}

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
                      {/* Move Input */}
                      <MoveInputPanel
                        preferences={preferences}
                        updatePreferences={updatePreferences}
                        currentFen={displayFen || currentFen}
                        moveInput={moveInput.value}
                        onMoveInputChange={moveInput.setValue}
                        error={feedbackIsError ? feedbackMessage : null}
                        onErrorClear={moveInput.clearFeedback}
                        onSubmit={actions.handleSubmitMove}
                        inputPlaceholder={t('inputMove')}
                        selectPlaceholder={t('selectMove')}
                        toggleTitle={t('switchInputMode')}
                        playerColor={currentFen.split(' ')[1] === 'b' ? 'b' : 'w'}
                      />

                      {/* Correct move feedback */}
                      {feedback?.type === 'correct' && feedbackMessage && (
                        <p className="text-success text-sm mt-[-16px]">{feedbackMessage}</p>
                      )}
                      {feedback?.type === 'skipped' && feedbackMessage && (
                        <p className="text-muted-foreground text-sm mt-[-16px]">
                          {feedbackMessage}
                        </p>
                      )}

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
                      </div>

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
                          className="px-4 py-2"
                        >
                          <span className={settings.dontKnowCount >= 2 ? 'hidden md:inline' : ''}>
                            {t('dontKnow')}
                          </span>
                        </Button>
                        {settings.dontKnowCount >= 2 && (
                          <button
                            onClick={() => setShowAnalyzeAllConfirm(true)}
                            className="px-4 py-2 border border-border rounded-md hover:bg-muted flex items-center gap-2"
                          >
                            <FaCheck className="w-4 h-4" />
                            {t('autoFillAll')}
                          </button>
                        )}
                      </div>
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

                  {/* Action Buttons */}
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => setIsBoardVisible(true)}
                      className="px-4 py-2 border border-border rounded-md hover:bg-muted flex items-center justify-center gap-2"
                      title={t('showBoard')}
                    >
                      <FaEye className="w-4 h-4" />
                      <span>{t('showBoard')}</span>
                    </button>
                  </div>

                  {/* Move log link */}
                  <div className="text-center">
                    <button
                      onClick={() => setShowMoveLogModal(true)}
                      className={`text-xs ${TEXT_LINK_MUTED_CLASSES}`}
                    >
                      {t('log')}
                    </button>
                  </div>
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

      {/* Move Log Modal */}
      <Modal
        isOpen={showMoveLogModal}
        title={t('moveLog')}
        onClose={() => setShowMoveLogModal(false)}
      >
        {(() => {
          const relevantEntries = moveLog.entries.filter(
            (e) => e.status === 'incorrect' || e.status === 'auto'
          );
          if (relevantEntries.length === 0) {
            return <p className="text-center text-muted-foreground py-4">{t('noMistakes')}</p>;
          }
          return (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-accent">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">{t('logMoveNumber')}</th>
                    <th className="text-left px-4 py-3 font-medium">{t('logIncorrectMove')}</th>
                    <th className="text-left px-4 py-3 font-medium">{t('logCorrectMove')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {relevantEntries.map((entry, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 text-muted-foreground">
                        {entry.isWhiteMove ? `${entry.moveNumber}.` : `${entry.moveNumber}...`}
                      </td>
                      {entry.status === 'incorrect' ? (
                        <>
                          <td className="px-4 py-3 text-destructive">{entry.incorrectMove}</td>
                          <td className="px-4 py-3 text-success">{entry.move}</td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 text-muted-foreground">{t('logAutoFilled')}</td>
                          <td className="px-4 py-3 text-muted-foreground">{entry.move}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}
      </Modal>

      {/* Auto Fill All Confirmation Modal */}
      <ConfirmationModal
        isOpen={showAnalyzeAllConfirm}
        onCancel={() => setShowAnalyzeAllConfirm(false)}
        onConfirm={() => {
          setShowAnalyzeAllConfirm(false);
          actions.handleAnalyzeAll();
        }}
        title={t('confirmAutoFillAllTitle')}
        message={t('confirmAutoFillAllMessage')}
        confirmText={t('autoFillAll')}
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
