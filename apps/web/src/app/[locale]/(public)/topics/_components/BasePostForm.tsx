'use client';

import { type ReactNode, useActionState, useCallback, useState } from 'react';

import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import { Button, FormErrorBanner, Textarea, UnsavedChangesDialog } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

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
};

export function BasePostForm({
  action,
  translationNamespace,
  submitDisabled = false,
  contentRequired = true,
  beforeContent,
  onContentChange,
}: Props) {
  const t = useTranslations(translationNamespace);
  const tUnsaved = useTranslations('unsavedChanges');
  const [state, formAction, isPending] = useActionState(action, {});
  const [isDirty, setIsDirty] = useState(false);

  const { isBlocking, confirm, cancel } = useUnsavedChanges({ isDirty });

  const markDirty = useCallback(() => {
    setIsDirty(true);
  }, []);

  const errorMessage = state.error
    ? t.has(state.error)
      ? t(state.error as string)
      : t('error')
    : null;

  return (
    <form action={formAction} className="space-y-4">
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

      <div className="space-y-2">
        <label htmlFor="replyPermission" className="block text-sm font-medium text-foreground">
          {t('replyPermissionLabel')}
        </label>
        <select
          id="replyPermission"
          name="replyPermission"
          defaultValue="everyone"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
        >
          <option value="everyone">{t('replyPermission_everyone')}</option>
          <option value="followers">{t('replyPermission_followers')}</option>
          <option value="nobody">{t('replyPermission_nobody')}</option>
        </select>
      </div>

      <Button
        type="submit"
        variant="primary"
        fullWidth
        disabled={isPending || submitDisabled}
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
