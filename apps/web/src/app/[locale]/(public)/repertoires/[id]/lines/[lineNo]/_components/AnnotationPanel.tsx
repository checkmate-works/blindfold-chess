'use client';

import { useState, useTransition } from 'react';

import { useTranslations } from 'next-intl';

import { Button, FormErrorBanner, Textarea, UnsavedChangesDialog } from '@/app/_components';
import { FiEdit2, FiPlus, FiTrash2 } from 'react-icons/fi';

import { REPERTOIRE_ANNOTATION_MAX } from '@/lib/repertoires/validation';

import { GameCommentBody } from '@/app/[locale]/(public)/games/shared/[id]/_components/GameCommentBody';
import type { MoveNotationLine } from '@/app/[locale]/(public)/topics/_lib/move-notation';
import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import { OwnerActionButton } from '@/app/[locale]/_components/OwnerActionChip';

import { deleteAnnotation } from '../_actions/deleteAnnotation';
import { saveAnnotation } from '../_actions/saveAnnotation';

type Props = {
  repertoireId: string;
  lineNo: number;
  locale: string;
  /** Normalised FEN of the position reached by this move (the annotation key). */
  positionKey: string;
  /** The move this note explains, e.g. "3. d4" — for the heading. */
  moveLabel: string;
  initialText: string | null;
  /**
   * The line's moves, so a note that cites a move by number ("1... e4") renders
   * it as a board-preview link — the same treatment comments get.
   */
  moveNotation: MoveNotationLine;
  isOwner: boolean;
};

/**
 * The owner-authored "why this move" note for the selected move (the Chessable
 * right-panel idea). Read-only for everyone; the owner gets an inline editor.
 * Remounted per move (keyed on positionKey by the parent), so editing state
 * resets cleanly when navigating between moves.
 */
export function AnnotationPanel({
  repertoireId,
  lineNo,
  locale,
  positionKey,
  moveLabel,
  initialText,
  moveNotation,
  isOwner,
}: Props) {
  const t = useTranslations('Repertoires.line.annotation');
  const tUnsaved = useTranslations('unsavedChanges');
  const [savedText, setSavedText] = useState<string | null>(initialText);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialText ?? '');
  const [error, setError] = useState<string | null>(null);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isDirty = draft !== (savedText ?? '');

  function openEditor() {
    setDraft(savedText ?? '');
    setError(null);
    setEditing(true);
  }

  // Mirror the comment edit form: confirm before discarding, but only when the
  // draft actually diverges from the saved note.
  function handleCancel() {
    if (isDirty) {
      setConfirmingDiscard(true);
    } else {
      setEditing(false);
    }
  }

  function discardAndClose() {
    setConfirmingDiscard(false);
    setDraft(savedText ?? '');
    setEditing(false);
  }

  function onSave() {
    setError(null);
    startTransition(async () => {
      const result = await saveAnnotation({
        repertoireId,
        lineNo,
        locale,
        positionKey,
        text: draft,
      });
      if (result.ok) {
        setSavedText(result.text);
        setEditing(false);
      } else {
        setError(t.has(result.error) ? t(result.error) : t('error'));
      }
    });
  }

  function onDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteAnnotation({ repertoireId, lineNo, locale, positionKey });
      setConfirmingDelete(false);
      if (result.ok) {
        setSavedText(null);
        setEditing(false);
      } else {
        setError(t.has(result.error) ? t(result.error) : t('error'));
      }
    });
  }

  const heading = (
    <h3 className="text-xs font-semibold text-muted-foreground">
      {t('title')} · <span className="text-foreground">{moveLabel}</span>
    </h3>
  );

  // The saved note as the reader sees it: plain text, except that a move cited
  // by number ("1... e4") becomes a board-preview link.
  const noteBody = (
    <p className="whitespace-pre-wrap text-foreground">
      <GameCommentBody
        text={savedText ?? ''}
        locale={locale}
        moves={moveNotation.moves}
        startingFen={moveNotation.startingFen}
        playerColor={moveNotation.playerColor}
      />
    </p>
  );

  // Non-owner: show the note when present, otherwise render nothing.
  if (!isOwner) {
    if (!savedText) return null;
    return (
      <section className="space-y-2 rounded-lg border border-border bg-muted/30 p-4">
        {heading}
        {noteBody}
      </section>
    );
  }

  return (
    <section className="space-y-2 rounded-lg border border-border bg-muted/30 p-4">
      {heading}

      {editing ? (
        <div className="space-y-2">
          <FormErrorBanner message={error} />
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
            maxLength={REPERTOIRE_ANNOTATION_MAX}
            placeholder={t('placeholder')}
            autoFocus
          />
          {/* Save / Cancel only — Delete belongs to the note, not to the edit
              session, so it lives in the owner row alongside Edit (the same
              pairing every other UGC surface uses). Mirrors EditPostForm: a
              full-width primary submit with a quiet cancel below it. */}
          <div className="space-y-3 pt-1">
            <Button
              type="button"
              variant="primary"
              size="lg"
              fullWidth
              onClick={onSave}
              disabled={isPending}
              loading={isPending}
            >
              {isPending ? t('saving') : t('save')}
            </Button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isPending}
              className="block w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            >
              {t('cancel')}
            </button>
          </div>

          <UnsavedChangesDialog
            open={confirmingDiscard}
            onConfirm={discardAndClose}
            onCancel={() => setConfirmingDiscard(false)}
            title={tUnsaved('title')}
            message={tUnsaved('message')}
            confirmLabel={tUnsaved('confirm')}
            cancelLabel={tUnsaved('cancel')}
          />
        </div>
      ) : savedText ? (
        <div className="space-y-3">
          {noteBody}
          <FormErrorBanner message={error} />
          {/* Owner row — Edit and Delete as one pair, the same chips every other
              UGC detail surface uses. */}
          <div className="flex flex-wrap items-center gap-3">
            <OwnerActionButton size="xs" onClick={openEditor} disabled={isPending}>
              <FiEdit2 aria-hidden />
              {t('editButton')}
            </OwnerActionButton>
            <OwnerActionButton
              size="xs"
              tone="danger"
              onClick={() => setConfirmingDelete(true)}
              disabled={isPending}
            >
              <FiTrash2 aria-hidden />
              {t('delete')}
            </OwnerActionButton>
          </div>
        </div>
      ) : (
        <OwnerActionButton size="xs" onClick={openEditor}>
          <FiPlus aria-hidden />
          {t('addButton')}
        </OwnerActionButton>
      )}

      <ConfirmationModal
        isOpen={confirmingDelete}
        title={t('deleteConfirmTitle')}
        message={t('deleteConfirmMessage')}
        confirmText={t('delete')}
        cancelText={t('cancel')}
        confirmVariant="danger"
        isLoading={isPending}
        onConfirm={onDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </section>
  );
}
