'use client';

import { type ReactNode, useActionState, useCallback, useRef, useState } from 'react';

import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import { Button, FormErrorBanner, Textarea, UnsavedChangesDialog } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { GRANT_TYPE_DEFAULTS } from '@/lib/db/data/grant-types';

import { GrantInfoModal } from './GrantInfoModal';

const GRANT_INFO_MODAL_STORAGE_KEY = 'bc_topic_post_grant_modal_shown_v1';

type Props = {
  /** Bound server action (locale/slug already bound) */
  action: (prevState: { error?: string }, formData: FormData) => Promise<{ error?: string }>;
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
  /** When true, show a one-time pre-submit modal explaining the ad-free grant policy.
   *  Persisted via localStorage so it only appears until the user confirms once. */
  showGrantInfoModal?: boolean;
};

/**
 * Shared post form rendering content + submit, used by every new-post form
 * across topics (squares, openings, chunks).
 *
 * @description
 * The "Who can reply" selector is intentionally not rendered while reply-
 * permission control is hidden from end users (planned to ship later as a
 * paid feature). A hidden input still submits the schema default
 * (`'everyone'`) so `createPostBase` and the rest of the Server Action
 * pipeline continue to receive a valid `replyPermission` value with no
 * server-side changes. Replacing the hidden input with the original
 * `<label>` + `<select>` (everyone / followers / nobody, i18n keys
 * preserved in every locale message file) is the only change required to
 * re-enable the flow.
 */
export function BasePostForm({
  action,
  translationNamespace,
  submitDisabled = false,
  contentRequired = true,
  beforeContent,
  onContentChange,
  showGrantInfoModal = false,
}: Props) {
  const t = useTranslations(translationNamespace);
  const tGlobal = useTranslations();
  const tUnsaved = useTranslations('unsavedChanges');
  const [state, formAction, isPending] = useActionState(action, {});
  const [isDirty, setIsDirty] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const { isBlocking, confirm, cancel } = useUnsavedChanges({ isDirty });

  const markDirty = useCallback(() => {
    setIsDirty(true);
  }, []);

  const handleSubmitClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!showGrantInfoModal) return;

    let alreadyShown = false;
    try {
      alreadyShown =
        typeof window !== 'undefined' && localStorage.getItem(GRANT_INFO_MODAL_STORAGE_KEY) === '1';
    } catch {
      // localStorage may be disabled (e.g., Safari private mode); fall through
    }

    if (alreadyShown) return;

    e.preventDefault();
    setShowModal(true);
  };

  const handleModalConfirm = () => {
    try {
      localStorage.setItem(GRANT_INFO_MODAL_STORAGE_KEY, '1');
    } catch {
      // ignore storage failures
    }
    setShowModal(false);
    formRef.current?.requestSubmit();
  };

  const handleModalCancel = () => {
    setShowModal(false);
  };

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

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <FormErrorBanner message={errorMessage} />

      {beforeContent?.(markDirty)}

      <div className="space-y-2">
        <label htmlFor="content" className="block text-sm font-medium text-foreground">
          {t('contentLabel')}
        </label>
        <Textarea
          id="content"
          name="content"
          rows={6}
          maxLength={5000}
          placeholder={t('contentPlaceholder')}
          required={contentRequired}
          onChange={(e) => {
            setIsDirty(true);
            onContentChange?.(e.target.value.trim().length > 0);
          }}
        />
      </div>

      <input type="hidden" name="replyPermission" value="everyone" />

      <Button
        type="submit"
        variant="primary"
        fullWidth
        disabled={isPending || submitDisabled}
        loading={isPending}
        onClick={handleSubmitClick}
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

      <GrantInfoModal
        open={showModal}
        durationDays={GRANT_TYPE_DEFAULTS.topic_post.durationDays}
        onConfirm={handleModalConfirm}
        onCancel={handleModalCancel}
      />
    </form>
  );
}
