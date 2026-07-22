'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import { Button, Textarea, UnsavedChangesDialog } from '@/app/_components';
import { FiEdit2, FiPlus } from 'react-icons/fi';

import { REPERTOIRE_ANNOTATION_MAX } from '@/lib/repertoires/validation';

import { GameCommentBody } from '@/app/[locale]/(public)/games/shared/[id]/_components/GameCommentBody';
import type { MoveNotationLine } from '@/app/[locale]/(public)/topics/_lib/move-notation';
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
  // What the server holds (as far as this component knows) vs. the editor's
  // uncommitted buffer; Cancel is simply dropping the latter.
  const [text, setText] = useState((initialText ?? '').trim());
  const [draft, setDraft] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

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
      ? await saveAnnotation({ repertoireId, lineNo, locale, positionKey, text: value })
      : await deleteAnnotation({ repertoireId, lineNo, locale, positionKey });
    setPending(false);
    if (!result.ok) {
      setFailed(true);
      return;
    }
    setText(value);
    setIsEditing(false);
  }

  const heading = (
    <h3 className="text-xs font-semibold text-muted-foreground">
      {t('title')} · <span className="text-foreground">{moveLabel}</span>
    </h3>
  );

  // Read view — for the owner too, until they open the editor. A note is shown
  // as plain prose, except that a move cited by number ("1... e4") becomes a
  // board-preview link. Nothing at all when there is no note and no one who
  // could write one.
  if (!isEditing) {
    if (!text && !isOwner) return null;
    return (
      <section className="space-y-2">
        {heading}
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
        {isOwner && (
          <OwnerActionButton size="xs" onClick={openEditor}>
            {text ? <FiEdit2 aria-hidden /> : <FiPlus aria-hidden />}
            {text ? t('editAction') : t('addAction')}
          </OwnerActionButton>
        )}
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
