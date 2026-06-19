'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { BoardSkeleton, FlipBoardButton } from '@/app/_components';

import type { BoardAnnotations } from '@/lib/board-annotations/types';
import {
  CHUNK_FEEDBACK_TOPICS,
  type ChunkFeedbackTopic,
  type ChunkStatus,
  deriveSlugFromTitle,
} from '@/lib/chunks/validation';

import { BoardFenTabs } from '@/app/[locale]/(public)/practice/(free-play)/_components/BoardFenTabs';
import { EditableChessBoard } from '@/app/[locale]/(public)/practice/(free-play)/_components/EditableChessBoard';
import type { useFenBoardEditor } from '@/app/[locale]/(public)/practice/(free-play)/_hooks/use-fen-board-editor';
import { useEditableBoardLabels } from '@/app/[locale]/(public)/practice/(free-play)/puzzle/_hooks/use-editable-board-labels';
import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

type Props = {
  board: ReturnType<typeof useFenBoardEditor>;
  title: string;
  onTitleChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  slug: string;
  onSlugChange: (value: string) => void;
  annotations: BoardAnnotations;
  onAnnotationsChange: (next: BoardAnnotations) => void;
  /**
   * Intended status on the next submit. The "Save as draft" toggle only
   * renders on `mode='create'` — edit reaches into the existing row's
   * lifecycle via the dedicated Publish / Unpublish actions on the
   * detail page.
   */
  status: ChunkStatus;
  onStatusChange: (next: ChunkStatus) => void;
  /**
   * Fields the author has ticked to request targeted feedback on.
   * Only meaningful when the resulting chunk is in draft state — the
   * checkbox group is hidden in create mode when the draft toggle is
   * off (the rows wouldn't be persisted by the server anyway, see
   * `createChunkEntry`). Edit mode always shows it because reaching
   * the edit form already implies the chunk is in draft.
   */
  feedbackTopics: readonly ChunkFeedbackTopic[];
  onFeedbackTopicsChange: (next: ChunkFeedbackTopic[]) => void;
  /**
   * `'create'` shows the slug input as required + editable with the
   * "Generate from title" helper; `'edit'` locks it (slug is permanent —
   * see `lib/chunks/validation.ts` for the rationale).
   */
  mode: 'create' | 'edit';
  pending: boolean;
};

/**
 * Shared body of `ChunkForm` — title, description, board / FEN editor,
 * and the slug field. Mirrors the structure of `PuzzleFormFields` so the
 * two UGC flows look the same: tab switcher between piece-placement
 * board (`EditableChessBoard`) and raw FEN textarea, side-to-move
 * radio, flip + clear board controls. Annotations are intentionally
 * not editable from the user-facing form (defaulting to the empty
 * shape) — chunk annotations remain admin-only for now.
 */
export function ChunkFormFields({
  board,
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  slug,
  onSlugChange,
  annotations,
  onAnnotationsChange,
  status,
  onStatusChange,
  feedbackTopics,
  onFeedbackTopicsChange,
  mode,
  pending,
}: Props) {
  const t = useTranslations('chunks.form');
  const editableBoardLabels = useEditableBoardLabels();
  const { preferences, isLoaded } = useGamePreferences();

  const [clearBoardOpen, setClearBoardOpen] = useState(false);

  return (
    <>
      <div>
        <label htmlFor="chunk-title" className="block text-sm font-medium mb-1">
          {t('fields.title')} <span className="text-destructive">*</span>
        </label>
        <input
          id="chunk-title"
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="w-full px-3 py-2 rounded border border-border bg-card text-foreground"
          required
        />
      </div>

      <div>
        <label htmlFor="chunk-description" className="block text-sm font-medium mb-1">
          {t('fields.description')}
        </label>
        <textarea
          id="chunk-description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 rounded border border-border bg-card text-foreground"
        />
      </div>

      <BoardFenTabs
        activeTab={board.activeTab}
        onTabChange={board.setActiveTab}
        boardLabel={t('tabBoard')}
        fenLabel={t('tabFen')}
      />

      {board.activeTab === 'board' && (
        <>
          <div className="flex items-center justify-between gap-2 mb-2">
            <div
              role="radiogroup"
              aria-label={t('sideToMove')}
              className="inline-flex rounded-md border border-border overflow-hidden text-sm"
            >
              <button
                type="button"
                role="radio"
                aria-checked={board.sideToMove === 'w'}
                onClick={() => board.handleSideToMoveChange('w')}
                className={`px-3 py-1.5 transition-colors ${
                  board.sideToMove === 'w'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {t('sideWhite')}
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={board.sideToMove === 'b'}
                onClick={() => board.handleSideToMoveChange('b')}
                className={`px-3 py-1.5 transition-colors ${
                  board.sideToMove === 'b'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {t('sideBlack')}
              </button>
            </div>
            <FlipBoardButton onClick={board.handleFlip} title={t('flipBoard')} />
          </div>
          <div className="flex justify-center">
            <div className="w-full max-w-md">
              {!isLoaded ? (
                <BoardSkeleton />
              ) : (
                <EditableChessBoard
                  fen={board.boardFen}
                  onFenChange={board.handleBoardChange}
                  labels={editableBoardLabels}
                  editable={true}
                  flipped={board.flipped}
                  showCoordinates={true}
                  boardTheme={preferences.boardTheme}
                  annotations={annotations}
                  onAnnotationsChange={onAnnotationsChange}
                />
              )}
            </div>
          </div>

          {board.positionError && (
            <p className="text-sm text-destructive text-center">{t('errors.invalidFen')}</p>
          )}

          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setClearBoardOpen(true)}
              className="px-3 py-1 text-sm rounded border border-border text-muted-foreground hover:bg-muted transition-colors"
            >
              {t('clearBoard')}
            </button>
          </div>
        </>
      )}

      {board.activeTab === 'fen' && (
        <div>
          <label htmlFor="chunk-fen" className="block text-sm font-medium mb-1">
            {t('fields.fen')}
          </label>
          <textarea
            id="chunk-fen"
            value={board.fenInput}
            onChange={board.handleFenInputChange}
            placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
            rows={2}
            className="w-full px-3 py-2 rounded border border-border bg-card text-foreground text-sm font-mono"
          />
          <p className="text-xs text-muted-foreground mt-1">{t('hints.fen')}</p>
          {board.fenInput.trim() && !board.isFenValid && (
            <p className="text-sm text-destructive mt-1">{t('errors.invalidFen')}</p>
          )}
        </div>
      )}

      <div>
        <label htmlFor="chunk-slug" className="block text-sm font-medium mb-1">
          {t('fields.slug')} {mode === 'create' && <span className="text-destructive">*</span>}
        </label>
        <div className="flex gap-2">
          <input
            id="chunk-slug"
            type="text"
            value={slug}
            onChange={(e) => onSlugChange(e.target.value)}
            placeholder="rook-battery"
            className="flex-1 px-3 py-2 rounded border border-border bg-card text-foreground font-mono text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            required={mode === 'create'}
          />
          <button
            type="button"
            onClick={() => onSlugChange(deriveSlugFromTitle(title))}
            disabled={pending || !title.trim()}
            className="px-3 py-2 text-sm rounded border border-border bg-muted text-foreground hover:opacity-80 disabled:opacity-50 transition-opacity whitespace-nowrap"
          >
            {t('actions.generateFromTitle')}
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {mode === 'create' ? t('hints.slugCreate') : t('hints.slugDraftEditable')}
        </p>
      </div>

      {mode === 'create' && (
        <div className="rounded border border-border bg-card p-3">
          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={status === 'draft'}
              onChange={(e) => onStatusChange(e.target.checked ? 'draft' : 'published')}
              disabled={pending}
              className="mt-0.5"
            />
            <span className="space-y-1">
              <span className="block font-medium">{t('draft.toggleLabel')}</span>
              <span className="block text-xs text-muted-foreground">{t('draft.toggleHint')}</span>
            </span>
          </label>
        </div>
      )}

      {/*
       * Feedback-topic checkboxes are draft-only: in create mode they
       * appear after the user opts into Save-as-draft (the server-side
       * mutation also ignores topics when status !== 'draft'); in edit
       * mode the chunk is already guaranteed to be a draft (the page
       * guards published from reaching this form) so the panel always
       * renders.
       */}
      {(mode === 'edit' || (mode === 'create' && status === 'draft')) && (
        <fieldset className="space-y-2 rounded border border-border bg-card p-3">
          <legend className="px-1 text-sm font-medium">{t('feedbackTopics.legend')}</legend>
          <p className="text-xs text-muted-foreground">{t('feedbackTopics.hint')}</p>
          <div className="space-y-1">
            {CHUNK_FEEDBACK_TOPICS.map((topic) => {
              const checked = feedbackTopics.includes(topic);
              return (
                <label key={topic} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={pending}
                    onChange={(e) => {
                      // Toggle by replacing the array — small fixed size
                      // (currently 2 topics), so the O(n) splice is fine
                      // and avoids holding stale references in the parent.
                      const next = e.target.checked
                        ? [...feedbackTopics, topic]
                        : feedbackTopics.filter((t) => t !== topic);
                      onFeedbackTopicsChange(next as ChunkFeedbackTopic[]);
                    }}
                  />
                  <span>
                    {t(`feedbackTopics.options.${topic}` as 'feedbackTopics.options.title')}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      <ConfirmationModal
        isOpen={clearBoardOpen}
        title={t('clearBoardConfirmTitle')}
        message={t('clearBoardConfirmMessage')}
        confirmText={t('clearBoardConfirm')}
        cancelText={t('clearBoardCancel')}
        confirmVariant="danger"
        onConfirm={() => {
          setClearBoardOpen(false);
          board.handleClearBoard();
        }}
        onCancel={() => setClearBoardOpen(false)}
      />
    </>
  );
}
