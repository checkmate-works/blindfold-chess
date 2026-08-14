'use client';

import { useActionState, useEffect, useId, useRef, useState } from 'react';

import {
  Button,
  FormActionFooter,
  FormErrorBanner,
  Textarea,
  UnsavedChangesDialog,
} from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { MAX_CONTENT_LENGTH } from '@/lib/validations/content';

import type { EditPostAction } from '../_lib/action-types';

type Props = {
  postId: string;
  locale: string;
  initialContent: string;
  initialIsSpoiler: boolean;
  enableSpoilerToggle: boolean;
  editPostAction: EditPostAction;
  onSaved: (next: { content: string; isSpoiler: boolean; updatedAt: Date }) => void;
  onCancel: () => void;
};

/**
 * Inline edit form rendered in place of a topic_post's body when the author
 * clicks "Edit". Mirrors the createPost / reply form contract (textarea +
 * content counter + optional spoiler toggle) but submits to
 * `editPostAction(postId, locale, formData)` instead of a create action.
 *
 * On success the parent (CommentNode / OP card) swaps back to read mode with
 * the fresh content + updatedAt the server returned, so the "(edited)"
 * indicator updates without a page reload. Submit / cancel are mutually
 * exclusive — once submission is in flight, cancel is disabled too so the
 * user cannot dismiss a pending save and end up with desynced UI.
 */
export function EditPostForm({
  postId,
  locale,
  initialContent,
  initialIsSpoiler,
  enableSpoilerToggle,
  editPostAction,
  onSaved,
  onCancel,
}: Props) {
  const t = useTranslations('topics.edit');
  const tUnsaved = useTranslations('unsavedChanges');
  const textareaId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [content, setContent] = useState(initialContent);
  const [isSpoiler, setIsSpoiler] = useState(initialIsSpoiler);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  const isDirty = content !== initialContent || isSpoiler !== initialIsSpoiler;

  // Discard only needs confirming when something would actually be lost.
  function handleCancel() {
    if (isDirty) {
      setConfirmingDiscard(true);
    } else {
      onCancel();
    }
  }

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    // Drop the cursor at the end of the existing text rather than at index 0
    // so a small typo fix (e.g. trailing punctuation) doesn't require an
    // extra arrow-end press.
    el.focus();
    const end = el.value.length;
    el.setSelectionRange(end, end);
  }, []);

  const [state, formAction, isPending] = useActionState<{ error?: string }, FormData>(
    async (_prev, formData) => {
      const result = await editPostAction(postId, locale, formData);
      if ('error' in result) {
        return { error: result.error };
      }
      onSaved({
        content: result.content,
        isSpoiler: result.isSpoiler,
        updatedAt: result.updatedAt,
      });
      return {};
    },
    {}
  );

  const errorMessage = state.error ? (t.has(state.error) ? t(state.error) : t('error')) : null;

  return (
    <form action={formAction} className="space-y-2">
      <FormErrorBanner message={errorMessage} />

      <label htmlFor={textareaId} className="sr-only">
        {t('button')}
      </label>
      <Textarea
        id={textareaId}
        ref={textareaRef}
        name="content"
        rows={4}
        maxLength={MAX_CONTENT_LENGTH}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        required
      />

      {enableSpoilerToggle && (
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            name="isSpoiler"
            checked={isSpoiler}
            onChange={(e) => setIsSpoiler(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          <SpoilerToggleLabel />
        </label>
      )}

      {/* Save mirrors the full-width primary submit used by the new-comment /
          reply forms (BasePostForm); cancel is a quiet text link below so it
          reads as clearly secondary without crowding the primary action. */}
      <FormActionFooter cancel={{ label: t('cancel'), onClick: handleCancel, disabled: isPending }}>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          disabled={isPending}
          loading={isPending}
        >
          {isPending ? t('saving') : t('save')}
        </Button>
      </FormActionFooter>

      <UnsavedChangesDialog
        open={confirmingDiscard}
        onConfirm={() => {
          setConfirmingDiscard(false);
          onCancel();
        }}
        onCancel={() => setConfirmingDiscard(false)}
        title={tUnsaved('title')}
        message={tUnsaved('message')}
        confirmLabel={tUnsaved('confirm')}
        cancelLabel={tUnsaved('cancel')}
      />
    </form>
  );
}

function SpoilerToggleLabel() {
  const tTopics = useTranslations('topics.spoiler');
  return <>{tTopics('toggleLabel')}</>;
}
