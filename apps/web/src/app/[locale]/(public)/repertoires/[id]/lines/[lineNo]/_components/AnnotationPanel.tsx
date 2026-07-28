'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import { Button, Textarea, UnsavedChangesDialog } from '@/app/_components';
import { FiEdit2, FiPlus, FiTrash2 } from 'react-icons/fi';

import { REPERTOIRE_ANNOTATION_MAX } from '@/lib/repertoires/validation';

import { GameCommentBody } from '@/app/[locale]/(public)/games/shared/[id]/_components/GameCommentBody';
import type { MoveNotationLine } from '@/app/[locale]/(public)/topics/_lib/move-notation';
import { SectionTitle } from '@/app/[locale]/_components';
import { ActionsMenu, ActionsMenuButton } from '@/app/[locale]/_components/ActionsMenu';
import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';

import { deleteAnnotation } from '../_actions/deleteAnnotation';
import { saveAnnotation } from '../_actions/saveAnnotation';

type Props = {
  repertoireId: string;
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
 * right-panel idea). Everyone — owner included — reads it as plain prose first;
 * the owner opens the editor through an Edit / Add chip, the same way the rest
 * of the app gates owner actions. Reading is the common case even for the
 * owner, so a permanently-open textarea made every visit look like a form.
 *
 * Only the editor carries card chrome (border + muted fill): a filled box marks
 * "you are editing this", and using it for the note itself read as a quoted
 * block, unlike every other body of user text in the app.
 *
 * Edits commit on Save, like every other form in the app — the earlier
 * debounced autosave saved work the owner had not decided on yet, and gave
 * them no way to back out. Saving an emptied note deletes it. Remounted per
 * move (keyed on positionKey by the parent), so navigating to another move
 * drops an uncommitted draft along with the rest of the state.
 */
export function AnnotationPanel({
  repertoireId,
  locale,
  positionKey,
  moveLabel,
  initialText,
  moveNotation,
  isOwner,
}: Props) {
  const t = useTranslations('Repertoires.line.annotation');
  const tUnsaved = useTranslations('unsavedChanges');
  // What the server holds (as far as this component knows) vs. the editor's
  // uncommitted buffer; Cancel is simply dropping the latter.
  const [text, setText] = useState((initialText ?? '').trim());
  const [draft, setDraft] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  // Delete flow (kebab → confirmation), kept separate from the editor's state.
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Guards both ways out of an editor holding unsaved edits: the Cancel button
  // (requestDiscard) and leaving the page (navigation guard) share one dialog.
  const isDirty = isEditing && draft.trim() !== text;
  const { isBlocking, confirm, cancel, requestDiscard } = useUnsavedChanges({
    isDirty,
    onDiscard: () => setIsEditing(false),
  });

  function openEditor() {
    setDraft(text);
    setFailed(false);
    setIsEditing(true);
  }

  async function handleSave() {
    const value = draft.trim();
    if (value === text) {
      setIsEditing(false);
      return;
    }
    setPending(true);
    setFailed(false);
    const result = value
      ? await saveAnnotation({ repertoireId, positionKey, text: value })
      : await deleteAnnotation({ repertoireId, positionKey });
    setPending(false);
    if (!result.ok) {
      setFailed(true);
      return;
    }
    setText(value);
    setIsEditing(false);
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    const result = await deleteAnnotation({ repertoireId, positionKey });
    setDeleting(false);
    if (!result.ok) {
      setDeleteError(t('error'));
      return;
    }
    // Emptying the note drops the read view back to the "Add a note" CTA.
    setText('');
    setConfirmingDelete(false);
  }

  // The same section heading the comment thread below uses (SectionTitle), so
  // the note reads as a peer of the discussion — "Why this move · 1. Nf3" over
  // "Comments" — rather than a differently-styled sidebar label. The move it
  // names is de-emphasised so the "why this move" label stays the header.
  const headingContent = (
    <>
      {t('title')} <span className="font-normal text-muted-foreground">· {moveLabel}</span>
    </>
  );
  const heading = <SectionTitle>{headingContent}</SectionTitle>;

  // Read view — for the owner too, until they open the editor. A note is shown
  // as plain prose, except that a move cited by number ("1... e4") becomes a
  // board-preview link. Nothing at all when there is no note and no one who
  // could write one.
  if (!isEditing) {
    if (!text && !isOwner) return null;
    return (
      <section className="space-y-3">
        {text && isOwner ? (
          // Edit / Delete live behind the same "⋯" kebab the comment threads
          // use. The menu is overlaid (absolute) on top of a full-width heading
          // rather than sitting in a flex row beside it, so the SectionTitle's
          // underline runs unbroken across the whole width instead of stopping
          // at the menu. `pr-10` keeps the title text clear of the button.
          <div className="relative">
            <SectionTitle className="pr-10">{headingContent}</SectionTitle>
            <div className="absolute right-0 top-0">
              <ActionsMenu ariaLabel={t('moreActions')}>
                <ActionsMenuButton onClick={openEditor}>
                  <FiEdit2 className="h-4 w-4" aria-hidden />
                  {t('editAction')}
                </ActionsMenuButton>
                <ActionsMenuButton tone="danger" onClick={() => setConfirmingDelete(true)}>
                  <FiTrash2 className="h-4 w-4" aria-hidden />
                  {t('deleteAction')}
                </ActionsMenuButton>
              </ActionsMenu>
            </div>
          </div>
        ) : (
          heading
        )}

        {text && (
          <p className="whitespace-pre-wrap text-foreground">
            <GameCommentBody
              text={text}
              locale={locale}
              moves={moveNotation.moves}
              startingFen={moveNotation.startingFen}
              playerColor={moveNotation.playerColor}
            />
          </p>
        )}

        {isOwner && !text && (
          // The empty state is a full-width CTA, matching the comment thread's
          // "Join the conversation" button below it, so authoring the first
          // note reads as a peer invitation rather than a tiny afterthought.
          <button
            type="button"
            onClick={openEditor}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
          >
            <FiPlus aria-hidden className="text-muted-foreground" />
            <span>{t('addAction')}</span>
          </button>
        )}

        <ConfirmationModal
          isOpen={confirmingDelete}
          title={t('deleteConfirmTitle')}
          message={t('deleteConfirmMessage')}
          confirmText={t('deleteAction')}
          cancelText={t('cancel')}
          confirmVariant="danger"
          isLoading={deleting}
          error={deleteError}
          onConfirm={handleDelete}
          onCancel={() => {
            setConfirmingDelete(false);
            setDeleteError(null);
          }}
        />
      </section>
    );
  }

  return (
    <section className="space-y-2 rounded-lg border border-border bg-muted/30 p-4">
      {heading}
      <Textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={3}
        maxLength={REPERTOIRE_ANNOTATION_MAX}
        placeholder={t('placeholder')}
        aria-label={t('title')}
        autoFocus
      />
      <p className="text-xs text-muted-foreground">{t('sharedHelp')}</p>
      {failed && (
        <p role="alert" className="text-xs text-destructive">
          {t('error')}
        </p>
      )}
      <div className="space-y-2">
        <Button
          type="button"
          variant="primary"
          fullWidth
          onClick={handleSave}
          loading={pending}
          disabled={pending}
        >
          {pending ? t('saving') : t('save')}
        </Button>
        <Button
          type="button"
          variant="secondary"
          fullWidth
          onClick={requestDiscard}
          disabled={pending}
        >
          {t('cancel')}
        </Button>
      </div>

      <UnsavedChangesDialog
        open={isBlocking}
        onConfirm={confirm}
        onCancel={cancel}
        title={tUnsaved('title')}
        message={tUnsaved('message')}
        confirmLabel={tUnsaved('confirm')}
        cancelLabel={tUnsaved('cancel')}
      />
    </section>
  );
}
