'use client';

import { type ReactNode, useActionState, useCallback, useEffect, useRef, useState } from 'react';

import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import { Button, FormErrorBanner, Textarea, UnsavedChangesDialog } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaPaperclip } from 'react-icons/fa';

import { MAX_CONTENT_LENGTH } from '@/lib/validations/content';

import { AttachmentModal } from './AttachmentModal';
import type { AggregatedAttachmentMode } from './AttachmentModal';

type ServerAction = (prev: { error?: string }, formData: FormData) => Promise<{ error?: string }>;

/**
 * Per-form Server Actions for the attachment-enabled flow.
 *
 * The split is driven by the server-side dispatch shape:
 *   - `pgn` covers the empty / PGN body / Lichess URL paste paths.
 *     The server's `detectAttachmentInput` re-runs on the raw
 *     `attachment` form field and dispatches Lichess URLs into
 *     `resolveLichessAttachmentPgn` (Phase 13).
 *   - `fen` covers FEN attachments. The form fields
 *     `attachmentFen` + optional `attachmentFenCaption` are
 *     synthesised here from the modal's emitted mode so the host
 *     form does not have to know about the modal's portal.
 */
export type AttachmentActions = {
  pgn: ServerAction;
  fen: ServerAction;
};

type Props = {
  /**
   * Bound server action for the legacy / non-attachment flow. Used
   * when `attachmentActions` is omitted. Required when
   * `attachmentActions` is undefined; ignored otherwise.
   */
  action?: ServerAction;
  /**
   * Attachment-aware Server Actions. When provided, the form
   * renders a paperclip + AttachmentModal trigger row and routes
   * submit to `pgn` / `fen` based on the selected attachment kind.
   * When omitted, the form behaves as a plain content-only post
   * form (the legacy contract).
   */
  attachmentActions?: AttachmentActions;
  /** i18n namespace for form labels */
  translationNamespace: string;
  /** Whether the submit button should be disabled beyond isPending */
  submitDisabled?: boolean;
  /** Whether the content textarea is required */
  contentRequired?: boolean;
  /** Additional fields rendered before the content textarea.
   *  Receives a `markDirty` callback to notify the form of external changes. */
  beforeContent?: (markDirty: () => void) => ReactNode;
  /** Callback when content textarea value changes (receives whether textarea has content) */
  onContentChange?: (hasContent: boolean) => void;
  /**
   * When `true`, render an `isSpoiler` checkbox below the content textarea.
   * Currently surfaced only by the puzzle comment form so the author can
   * self-flag a comment that reveals the solution. The checkbox name is
   * `isSpoiler` and the value submitted is the standard `'on'` — the
   * Server Action wrapper is responsible for normalizing it to a boolean.
   */
  enableSpoilerToggle?: boolean;
};

/**
 * Shared post form rendering content + submit, used by every new-post form
 * across topics (chunks, squares, openings, puzzle, position-memory).
 *
 * @description
 * The "Who can reply" selector is intentionally not rendered while reply-
 * permission control is hidden from end users (planned to ship later as a
 * paid feature). A hidden input still submits the schema default
 * (`'everyone'`) so `createPostBase` and the rest of the Server Action
 * pipeline continue to receive a valid `replyPermission` value with no
 * server-side changes.
 *
 * @design Attachment integration (#84 horizontal rollout)
 *
 * Forms that opt into attachments pass `attachmentActions` instead of
 * `action`. The form then renders the paperclip + AttachmentModal
 * trigger row alongside an inline content counter, keeps the
 * `AggregatedAttachmentMode` state internally, and synthesises the
 * relevant `attachment*` form fields at submit time before invoking
 * the matching Server Action. Forms that opt out (the contract before
 * #84) continue to pass `action` and never see the attachment UI.
 */
export function BasePostForm({
  action,
  attachmentActions,
  translationNamespace,
  submitDisabled = false,
  contentRequired = true,
  beforeContent,
  onContentChange,
  enableSpoilerToggle = false,
}: Props) {
  const t = useTranslations(translationNamespace);
  const tTopics = useTranslations('topics');
  const tGlobal = useTranslations();
  const tUnsaved = useTranslations('unsavedChanges');

  const [attachment, setAttachment] = useState<AggregatedAttachmentMode>({ kind: 'empty' });
  const [modalOpen, setModalOpen] = useState(false);
  const [contentLength, setContentLength] = useState(0);
  const [isDirty, setIsDirty] = useState(false);

  // Pin attachment in a ref so the wrapped action's identity is
  // stable across re-renders. `useActionState` memoises the action
  // it was first called with and ignores subsequent identity
  // changes, so reading `attachment` directly from the closure
  // would freeze it at "empty" on the first submit.
  const attachmentRef = useRef(attachment);
  useEffect(() => {
    attachmentRef.current = attachment;
  }, [attachment]);

  const wrappedAction = useCallback<ServerAction>(
    async (prev, formData) => {
      if (attachmentActions) {
        const att = attachmentRef.current;
        if (att.kind === 'fen') {
          if (!att.valid) {
            return { error: 'postFenAttachment.error.invalidFenStructure' };
          }
          formData.set('attachmentFen', att.fen);
          if (att.caption !== null) {
            formData.set('attachmentFenCaption', att.caption);
          }
          return attachmentActions.fen(prev, formData);
        }
        if (att.kind === 'pgn') {
          // The AttachmentInput textarea lives inside a portal'd
          // modal so its `attachment` / `attachmentAnonymize` fields
          // are not captured by the parent form's FormData.
          // Synthesise them here from the captured mode.
          formData.set('attachment', att.pgn);
          if (att.anonymize) {
            formData.set('attachmentAnonymize', 'on');
          }
        }
        // `empty` falls through here — `pgn` action treats an empty
        // `attachment` field as a plain comment (chunks contract).
        return attachmentActions.pgn(prev, formData);
      }
      if (action) return action(prev, formData);
      return { error: 'error' };
    },
    [attachmentActions, action]
  );

  const [state, formAction, isPending] = useActionState(wrappedAction, {});
  const { isBlocking, confirm, cancel } = useUnsavedChanges({ isDirty });
  const markDirty = useCallback(() => setIsDirty(true), []);

  const onApplyAttachment = useCallback((mode: AggregatedAttachmentMode) => {
    setAttachment(mode);
    setIsDirty(true);
  }, []);

  // Errors come back from server actions either as plain keys (resolved
  // against the form's namespace) or as fully-qualified dotted paths
  // (e.g. `attachment.error.tooLarge`). The latter are resolved against
  // the global translator. If neither resolves, fall back to the form's
  // generic `error` key.
  const errorMessage = state.error
    ? t.has(state.error)
      ? t(state.error as string)
      : state.error.includes('.') && tGlobal.has(state.error)
        ? tGlobal(state.error)
        : t('error')
    : null;

  // Counter color logic synced from
  // `apps/web/src/app/_components/Textarea.tsx:39-45`. Inlined so the
  // counter can render alongside the paperclip icon row instead of the
  // default below-textarea slot.
  const ratio = MAX_CONTENT_LENGTH ? contentLength / MAX_CONTENT_LENGTH : 0;
  const counterColor =
    ratio >= 1
      ? 'text-destructive'
      : ratio >= 0.9
        ? 'text-warning dark:text-yellow-400'
        : 'text-muted-foreground';

  const showAttachment = attachmentActions !== undefined;
  const attachmentSummary = showAttachment ? describeAttachment(attachment) : null;

  const submitDisabledFinal =
    isPending ||
    submitDisabled ||
    (showAttachment && attachment.kind === 'fen' && !attachment.valid);

  return (
    <form action={formAction} className="space-y-4">
      <FormErrorBanner message={errorMessage} />

      {beforeContent?.(markDirty)}

      <div className="space-y-2">
        <label htmlFor="content" className="sr-only">
          {t('contentLabel')}
        </label>
        <Textarea
          id="content"
          name="content"
          rows={6}
          maxLength={MAX_CONTENT_LENGTH}
          placeholder={t('contentPlaceholder')}
          required={contentRequired}
          showCount={!showAttachment}
          onChange={(e) => {
            setIsDirty(true);
            setContentLength(e.target.value.length);
            onContentChange?.(e.target.value.trim().length > 0);
          }}
        />
        {showAttachment && (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center text-link-primary hover:opacity-80"
                // TODO(i18n): attachment.modal.openButton
                aria-label={attachment.kind === 'empty' ? 'Add attachment' : 'Edit attachment'}
              >
                <FaPaperclip aria-hidden="true" className="w-4 h-4" />
              </button>
              {attachmentSummary && (
                <p className="text-xs text-muted-foreground">{attachmentSummary}</p>
              )}
            </div>
            <p className={`text-xs ${counterColor}`}>
              {contentLength.toLocaleString()} / {MAX_CONTENT_LENGTH.toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {showAttachment && (
        <AttachmentModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onApply={onApplyAttachment}
        />
      )}

      <input type="hidden" name="replyPermission" value="everyone" />

      {enableSpoilerToggle && (
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            name="isSpoiler"
            className="h-4 w-4 rounded border-border"
            onChange={() => setIsDirty(true)}
          />
          {tTopics('spoiler.toggleLabel')}
        </label>
      )}

      <Button
        type="submit"
        variant="primary"
        fullWidth
        disabled={submitDisabledFinal}
        loading={isPending}
      >
        {isPending ? t('submitting') : t('submit')}
      </Button>

      <UnsavedChangesDialog
        open={isBlocking}
        onConfirm={confirm}
        onCancel={cancel}
        title={tUnsaved('title')}
        message={tUnsaved('message')}
        confirmLabel={tUnsaved('confirm')}
        cancelLabel={tUnsaved('cancel')}
      />
    </form>
  );
}

function describeAttachment(mode: AggregatedAttachmentMode): string | null {
  switch (mode.kind) {
    case 'empty':
      return null;
    case 'pgn':
      // TODO(i18n): attachment.modal.summary.pgn
      return 'Game (PGN) attached.';
    case 'fen':
      // TODO(i18n): attachment.modal.summary.fen
      return mode.valid ? 'Position (FEN) attached.' : 'Position (FEN) attached (invalid).';
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}
