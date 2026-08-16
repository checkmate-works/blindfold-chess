'use client';

import {
  type ReactNode,
  useActionState,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';

import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import { Button, FormErrorBanner, Textarea, UnsavedChangesDialog } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaPaperclip } from 'react-icons/fa';

import { MAX_CONTENT_LENGTH } from '@/lib/validations/content';

import { usePostImageAttachFlow } from '../_hooks/use-post-image-attach-flow';
import { applyAttachmentMode } from '../_lib/attachment-form-data';
import type { ImageAttachResult } from '../_lib/image-attach-types';
import { resolvePostFormError } from '../_lib/resolve-post-form-error';
import { AttachmentModal } from './AttachmentModal';
import type { AggregatedAttachmentMode } from './AttachmentModal';

type ServerAction = (prev: { error?: string }, formData: FormData) => Promise<{ error?: string }>;

/**
 * Image-attach action for the 2-step flow: create the post (no redirect)
 * and return its id so the client can POST each file to
 * `/api/posts/[id]/images`. Optional — surfaces that do not (yet) support
 * image attachments simply omit it and the Images tab's Apply is inert.
 */
type ImageCreateAction = (formData: FormData) => Promise<ImageAttachResult>;

/**
 * Per-form Server Actions for the attachment-enabled flow.
 *
 * The split is driven by the server-side dispatch shape:
 *   - `pgn` covers the empty / PGN body / Lichess URL paste paths.
 *     The server's `detectAttachmentInput` re-runs on the raw
 *     `attachment` form field and dispatches Lichess URLs into
 *     `resolveLichessAttachmentPgn`.
 *   - `fen` covers FEN attachments. The form fields
 *     `attachmentFen` + optional `attachmentFenCaption` are
 *     synthesised here from the modal's emitted mode so the host
 *     form does not have to know about the modal's portal.
 */
export type AttachmentActions = {
  pgn: ServerAction;
  fen: ServerAction;
  /**
   * Optional image-attach action (2-step flow). When provided, the
   * Images tab's Apply commits the selected files: this action creates
   * the post and returns its id, then the client uploads each file.
   */
  image?: ImageCreateAction;
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
  /**
   * Number of rows for the content textarea. Defaults to 6 (the new-post
   * form default). Set to 4 for inline reply forms so the textarea sits
   * comfortably under each comment without dominating the layout.
   */
  textareaRows?: number;
  /**
   * Whether to render the hidden `replyPermission` input. Defaults to
   * `true` for parity with the new-post form contract. Reply forms pass
   * `false` because reply permission lives on the root post — `createReplyBase`
   * does not read this field, so emitting it would be inert noise.
   */
  emitReplyPermissionField?: boolean;
  /**
   * Destination after a successful image attachment (2-step flow). The
   * PGN / FEN paths redirect server-side via the Server Action; the
   * image path cannot (it must return the post id first), so navigation
   * happens client-side here. New-post forms pass this to land on the
   * created post's detail page, mirroring the PGN / FEN redirect. When
   * omitted (e.g. inline reply forms), the thread is refreshed in place.
   */
  imageRedirectPath?: (postId: string) => string;
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
  textareaRows = 6,
  emitReplyPermissionField = true,
  imageRedirectPath,
}: Props) {
  const t = useTranslations(translationNamespace);
  const tTopics = useTranslations('topics');
  const tGlobal = useTranslations();
  const tUnsaved = useTranslations('unsavedChanges');

  // Per-instance id so multiple BasePostForms can coexist on the same
  // page (every CommentNode renders its own inline ReplyForm — without
  // this they would share `id="content"` and break the label/htmlFor
  // pairing for assistive tech).
  const textareaId = useId();

  const [attachment, setAttachment] = useState<AggregatedAttachmentMode>({ kind: 'empty' });
  const [modalOpen, setModalOpen] = useState(false);
  const [contentLength, setContentLength] = useState(0);
  const [isDirty, setIsDirty] = useState(false);

  // The asynchronous image create→upload→deferred-navigate lifecycle lives
  // in its own hook; the wrapped action below only dispatches into it.
  const clearDirty = useCallback(() => setIsDirty(false), []);
  const { runImageAttach } = usePostImageAttachFlow({
    isDirty,
    clearDirty,
    imageRedirectPath,
  });

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

        // Image attachments use the 2-step flow (create post → upload
        // each file). Handled before `applyAttachmentMode` because the
        // files are not serialised onto FormData.
        if (att.kind === 'image') {
          if (!attachmentActions.image) return { error: 'error' };
          return runImageAttach(attachmentActions.image, formData, att.files);
        }

        const applied = applyAttachmentMode(att, formData);
        if (!applied.ok) {
          return { error: 'postFenAttachment.error.invalidFenStructure' };
        }
        // `empty` and `pgn` both route through the pgn action — the
        // legacy chunks contract treats an empty `attachment` field as
        // a plain comment with no attachment row.
        const action$ = applied.kind === 'fen' ? attachmentActions.fen : attachmentActions.pgn;
        return action$(prev, formData);
      }
      if (action) return action(prev, formData);
      return { error: 'error' };
    },
    [attachmentActions, action, runImageAttach]
  );

  const [state, formAction, isPending] = useActionState(wrappedAction, {});
  const { isBlocking, confirm, cancel } = useUnsavedChanges({ isDirty });
  const markDirty = useCallback(() => setIsDirty(true), []);

  const onApplyAttachment = useCallback((mode: AggregatedAttachmentMode) => {
    setAttachment(mode);
    setIsDirty(true);
  }, []);

  const errorMessage = resolvePostFormError(state.error, t, tGlobal);

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
        <label htmlFor={textareaId} className="sr-only">
          {t('contentLabel')}
        </label>
        <Textarea
          id={textareaId}
          name="content"
          rows={textareaRows}
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

      {emitReplyPermissionField && <input type="hidden" name="replyPermission" value="everyone" />}

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
        size="lg"
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
    case 'image':
      // TODO(i18n): attachment.modal.summary.image
      return mode.files.length === 1
        ? '1 image attached.'
        : `${mode.files.length} images attached.`;
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}
