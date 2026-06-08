'use client';

import { useState, useTransition } from 'react';

import { useTranslations } from 'next-intl';

import { Button, FormErrorBanner, Textarea, UnsavedChangesDialog } from '@/app/_components';

import { REPERTOIRE_ANNOTATION_MAX } from '@/lib/repertoires/validation';

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
  isOwner,
}: Props) {
  const t = useTranslations('Repertoires.line.annotation');
  const tUnsaved = useTranslations('unsavedChanges');
  const [savedText, setSavedText] = useState<string | null>(initialText);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialText ?? '');
  const [error, setError] = useState<string | null>(null);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
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
      if (result.ok) {
        setSavedText(null);
        setEditing(false);
      } else {
        setError(t.has(result.error) ? t(result.error) : t('error'));
      }
    });
  }

  const heading = (
    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {t('title')} · <span className="text-foreground">{moveLabel}</span>
    </h3>
  );

  // Non-owner: show the note when present, otherwise render nothing.
  if (!isOwner) {
    if (!savedText) return null;
    return (
      <section className="space-y-2 rounded-lg border border-border bg-muted/30 p-4">
        {heading}
        <p className="whitespace-pre-wrap text-foreground">{savedText}</p>
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
          {/* Save / Cancel mirror the comment edit form (EditPostForm): a
              full-width primary submit, a quiet cancel link below it, and a
              discard confirmation when there are unsaved edits. Delete is the
              annotation-specific extra, kept as a quiet destructive link. */}
          <div className="space-y-2">
            <Button
              type="button"
              variant="primary"
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
            {savedText && (
              <button
                type="button"
                onClick={onDelete}
                disabled={isPending}
                className="block w-full text-center text-sm text-destructive transition-colors hover:underline disabled:opacity-50"
              >
                {t('delete')}
              </button>
            )}
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
        <div className="space-y-2">
          <p className="whitespace-pre-wrap text-foreground">{savedText}</p>
          <button
            type="button"
            onClick={openEditor}
            className="text-sm text-link-primary transition-colors hover:underline"
          >
            {t('editButton')}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={openEditor}
          className="text-sm text-link-primary transition-colors hover:underline"
        >
          {t('addButton')}
        </button>
      )}
    </section>
  );
}
