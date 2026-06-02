'use client';

import { type ReactNode, useEffect, useId, useRef, useState } from 'react';

import { Button, FormErrorBanner, Textarea } from '@/app/_components';

import { MAX_GAME_COMMENT_LENGTH } from '../_lib/comment-constants';
import type { MutationResult } from './GameCommentContext';

type Props = {
  /** Submit handler; returns a localized `error` on failure. */
  onSubmit: (body: string) => Promise<MutationResult>;
  submitLabel: string;
  submittingLabel: string;
  placeholder?: string;
  initialValue?: string;
  /**
   * `compose` (post / reply) renders a single full-width primary button —
   * matching the topics post / reply form. `edit` renders a left-aligned
   * "Save" + "Cancel" row — matching the topics in-place edit form.
   */
  variant?: 'compose' | 'edit';
  /** "Cancel" handler for the `edit` variant's secondary button. */
  onCancel?: () => void;
  cancelLabel?: string;
  autoFocus?: boolean;
  /** Injected above the textarea (e.g. the "replying to @name ×" cue). */
  header?: ReactNode;
  /** Clear the textarea after a successful submit (used by the top-level form). */
  resetOnSuccess?: boolean;
};

/**
 * Shared textarea form for posting, replying to, and editing a game comment —
 * the chrome (textarea + content limit + error banner + submit) matches the
 * topics forms so they read the same: a full-width primary submit for compose,
 * a Save/Cancel row for edit. The caller supplies the action via `onSubmit`;
 * the form owns only its draft + pending / error state.
 */
export function GameCommentForm({
  onSubmit,
  submitLabel,
  submittingLabel,
  placeholder,
  initialValue = '',
  variant = 'compose',
  onCancel,
  cancelLabel,
  autoFocus = false,
  header,
  resetOnSuccess = false,
}: Props) {
  const textareaId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState(initialValue);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!autoFocus) return;
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    const end = el.value.length;
    el.setSelectionRange(end, end);
  }, [autoFocus]);

  async function handleSubmit() {
    const trimmed = value.trim();
    if (trimmed.length === 0 || trimmed.length > MAX_GAME_COMMENT_LENGTH || submitting) return;
    setSubmitting(true);
    setError(null);
    const result = await onSubmit(trimmed);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (resetOnSuccess) setValue('');
  }

  return (
    <div className="space-y-2">
      <FormErrorBanner message={error} />
      {header}
      <label htmlFor={textareaId} className="sr-only">
        {submitLabel}
      </label>
      <Textarea
        id={textareaId}
        ref={textareaRef}
        rows={4}
        maxLength={MAX_GAME_COMMENT_LENGTH}
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
      />
      {variant === 'edit' ? (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={value.trim().length === 0 || submitting}
            loading={submitting}
          >
            {submitting ? submittingLabel : submitLabel}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={submitting}
          >
            {cancelLabel}
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="primary"
          fullWidth
          onClick={handleSubmit}
          disabled={value.trim().length === 0 || submitting}
          loading={submitting}
        >
          {submitting ? submittingLabel : submitLabel}
        </Button>
      )}
    </div>
  );
}
