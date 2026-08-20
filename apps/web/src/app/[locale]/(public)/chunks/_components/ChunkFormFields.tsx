'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import {
  FieldError,
  FlipBoardButton,
  GenerateSlugButton,
  fieldBorderClass,
  fieldErrorProps,
} from '@/app/_components';
import { STARTING_FEN } from '@blindfold-chess/features/chess-core/fen';

import type { BoardAnnotations } from '@/lib/board-annotations/types';
import {
  CHUNK_FEEDBACK_TOPICS,
  type ChunkFeedbackTopic,
  type ChunkStatus,
} from '@/lib/chunks/validation';

import { BoardFenTabs } from '@/app/[locale]/(public)/practice/(free-play)/_components/BoardFenTabs';
import { EditableBoardSkeleton } from '@/app/[locale]/(public)/practice/(free-play)/_components/EditableBoardSkeleton';
import { EditableChessBoard } from '@/app/[locale]/(public)/practice/(free-play)/_components/EditableChessBoard';
import { useEditableBoardLabels } from '@/app/[locale]/(public)/practice/(free-play)/_hooks/use-editable-board-labels';
import type { useFenBoardEditor } from '@/app/[locale]/(public)/practice/(free-play)/_hooks/use-fen-board-editor';
import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import type { ChunkFormField } from '../_lib/chunk-form-validation';

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
   * Intended status on the next submit, driven by the "Save as draft"
   * toggle (shown in both modes). Checked → draft; unchecked → the
   * preview's confirm becomes Publish. Edit seeds 'draft' (the only
   * status that reaches this form), so its checkbox starts checked.
   */
  status: ChunkStatus;
  onStatusChange: (next: ChunkStatus) => void;
  /**
   * Fields the author has ticked to request targeted feedback on.
   * Only meaningful in draft state — the checkbox group is hidden
   * whenever the draft toggle is off (the rows wouldn't be persisted by
   * the server anyway, see `createChunkEntry` / `publishChunkEntry`).
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
  /**
   * The submit gate's verdict per control (`useSubmitError.messageFor`).
   * Drives the highlight, the `aria-invalid` / `aria-describedby` pair,
   * and the message rendered directly under the control — the author
   * should never have to hunt elsewhere on the page for the reason.
   */
  messageFor: (field: ChunkFormField) => string | null;
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
  messageFor,
}: Props) {
  const t = useTranslations('chunks.form');
  const editableBoardLabels = useEditableBoardLabels('practice.puzzle');
  const { preferences, isLoaded } = useGamePreferences();

  const [clearBoardOpen, setClearBoardOpen] = useState(false);

  const titleError = messageFor('title');
  const descriptionError = messageFor('description');
  const slugError = messageFor('slug');
  const fenError = messageFor('fen');

  // A description is only mandatory on the publish path, so the required
  // marker follows the "Save as draft" toggle rather than being static.
  // Create mode defaults to publishing — without this the requirement
  // was invisible until submit rejected it.
  const descriptionRequired = status === 'published';

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
          className={`w-full px-3 py-2 rounded border bg-card text-foreground ${fieldBorderClass(titleError)}`}
          required
          {...fieldErrorProps('chunk-title-error', titleError)}
        />
        <FieldError id="chunk-title-error" message={titleError} />
      </div>

      <div>
        <label htmlFor="chunk-description" className="block text-sm font-medium mb-1">
          {t('fields.description')}{' '}
          {descriptionRequired && <span className="text-destructive">*</span>}
        </label>
        <textarea
          id="chunk-description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          rows={4}
          className={`w-full px-3 py-2 rounded border bg-card text-foreground ${fieldBorderClass(descriptionError)}`}
          required={descriptionRequired}
          {...fieldErrorProps('chunk-description-error', descriptionError)}
        />
        <FieldError id="chunk-description-error" message={descriptionError} />
      </div>

      {/*
       * `id` + `tabIndex` make the whole position block a focus target:
       * the FEN rule can fail while the board tab is active, where there
       * is no text input to focus. See `reportError` in `ChunkForm`.
       */}
      <div
        id="chunk-position"
        tabIndex={-1}
        role="group"
        aria-label={t('positionLabel')}
        aria-describedby={
          fenError && board.activeTab === 'board' ? 'chunk-position-error' : undefined
        }
        className="space-y-6"
      >
        <div>
          <span className="block text-sm font-medium mb-1">{t('positionLabel')}</span>
          <BoardFenTabs
            activeTab={board.activeTab}
            onTabChange={board.setActiveTab}
            boardLabel={t('tabBoard')}
            fenLabel={t('tabFen')}
          />
        </div>

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
            {!isLoaded ? (
              <EditableBoardSkeleton />
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

            {/*
             * `fenError` is the submit gate's verdict (covers "no
             * position placed at all"); `positionError` is the board
             * editor's own live complaint. Either renders here, right
             * under the board the author has to fix.
             */}
            {(fenError || board.positionError) && (
              <p
                id="chunk-position-error"
                role="alert"
                className="text-sm text-destructive text-center"
              >
                {fenError ?? t('errors.invalidFen')}
              </p>
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
              placeholder={STARTING_FEN}
              rows={2}
              className={`w-full px-3 py-2 rounded border bg-card text-foreground text-sm font-mono ${fieldBorderClass(fenError)}`}
              {...fieldErrorProps('chunk-fen-error', fenError)}
            />
            <p className="text-xs text-muted-foreground mt-1">{t('hints.fen')}</p>
            <FieldError
              id="chunk-fen-error"
              message={
                fenError ??
                (board.fenInput.trim() !== '' && !board.isFenValid ? t('errors.invalidFen') : null)
              }
            />
          </div>
        )}
      </div>

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
            className={`flex-1 px-3 py-2 rounded border bg-card text-foreground font-mono text-sm disabled:opacity-60 disabled:cursor-not-allowed ${fieldBorderClass(slugError)}`}
            required={mode === 'create'}
            {...fieldErrorProps('chunk-slug-error', slugError)}
          />
          <GenerateSlugButton
            title={title}
            onSlugChange={onSlugChange}
            label={t('actions.generateFromTitle')}
            disabled={pending}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {mode === 'create' ? t('hints.slugCreate') : t('hints.slugDraftEditable')}
        </p>
        <FieldError id="chunk-slug-error" message={slugError} />
      </div>

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

      {/*
       * Feedback-topic checkboxes are draft-only in both modes: they appear
       * only while "Save as draft" is on (the server-side mutation also
       * ignores topics when status !== 'draft'). Unchecking the toggle to
       * publish hides them, since a published chunk carries no draft-only
       * feedback signals.
       */}
      {status === 'draft' && (
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
