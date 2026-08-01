'use client';

import { useRef, useState, useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { useSubmitError } from '@/_hooks/useSubmitError';
import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import { FieldError, fieldErrorProps } from '@/app/_components/FieldError';
import { UnsavedChangesDialog } from '@/app/_components/UnsavedChangesDialog';
import { AdminFormTopBar } from '@/app/admin/_components/forms';

import { useToast } from '@/app/[locale]/_contexts/ToastContext';

import { PublishedConfirmModal } from '../../_components/PublishedConfirmModal';

type AnnouncementEditData = {
  slug: string;
  title: string;
  content: string;
  locale: string;
};

type AnnouncementFormProps = {
  defaultValues?: AnnouncementEditData;
  defaultSlug?: string;
  defaultLocale?: string;
  isPublished?: boolean;
  lockSlug?: boolean;
  lockLocale?: boolean;
  onSaveDraft: (
    data: AnnouncementEditData
  ) => Promise<{ success: true; id: string } | { error: string }>;
  labels: {
    formTitle: string;
    slug: string;
    slugPlaceholder: string;
    title: string;
    titlePlaceholder: string;
    content: string;
    contentPlaceholder: string;
    locale: string;
    saveDraft: string;
    savingDraft: string;
    savePublished: string;
    savingPublished: string;
    preview: string;
    cancel: string;
    unsavedChangesTitle: string;
    unsavedChangesMessage: string;
    unsavedChangesConfirm: string;
    unsavedChangesCancel: string;
    draftSaved: string;
    publishedSaved: string;
    publishedConfirmTitle: string;
    publishedConfirmMessage: string;
    publishedConfirmConfirm: string;
    publishedConfirmCancel: string;
  };
};

/** Where a rejection lands, per field named by `validateAnnouncementData`. */
const FIELD_ANCHOR_IDS: Record<string, string> = {
  slug: 'announcement-slug',
  title: 'announcement-title',
  locale: 'announcement-locale',
  content: 'announcement-content',
};

export function AnnouncementForm({
  defaultValues,
  defaultSlug,
  defaultLocale,
  isPublished = false,
  lockSlug = false,
  lockLocale = false,
  onSaveDraft,
  labels,
}: AnnouncementFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [publishedConfirmOpen, setPublishedConfirmOpen] = useState(false);
  const [isNavigatingToPreview, setIsNavigatingToPreview] = useState(false);

  // Same full-height layout as ArticleForm, so the same rule: a rejection is
  // shown at the input it names, not in a strip under the top bar.
  const submitError = useSubmitError<string>((field) => FIELD_ANCHOR_IDS[field] ?? null);
  const slugError = submitError.messageFor('slug');
  const titleError = submitError.messageFor('title');
  const localeError = submitError.messageFor('locale');
  const contentError = submitError.messageFor('content');

  function reportSaveError(result: { error: string; field?: string }) {
    submitError.report(
      result.field && FIELD_ANCHOR_IDS[result.field] ? result.field : null,
      result.error
    );
  }

  const initialSlug = defaultValues?.slug ?? defaultSlug ?? '';
  const initialTitle = defaultValues?.title ?? '';
  const initialContent = defaultValues?.content ?? '';
  const initialLocale = defaultValues?.locale ?? defaultLocale ?? 'en';

  const [slug, setSlug] = useState(initialSlug);
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [locale, setLocale] = useState(initialLocale);

  const isSubmittedRef = useRef(false);
  const isDirty =
    !isSubmittedRef.current &&
    !isNavigatingToPreview &&
    (slug !== initialSlug ||
      title !== initialTitle ||
      content !== initialContent ||
      locale !== initialLocale);

  const {
    isBlocking,
    confirm: confirmNavigation,
    cancel: cancelNavigation,
  } = useUnsavedChanges({ isDirty });

  const executeSave = () => {
    submitError.clear();
    startTransition(async () => {
      const result = await onSaveDraft({ slug, title, content, locale });

      if ('error' in result) {
        reportSaveError(result);
      } else {
        isSubmittedRef.current = true;
        showToast(isPublished ? labels.publishedSaved : labels.draftSaved, 'success');
        // For new announcements, redirect to edit so subsequent saves are updates.
        // For existing announcements, stay on the page.
        if (!defaultValues) {
          window.location.replace(`/admin/announcements/${result.id}/edit`);
        }
      }
    });
  };

  const handleSaveDraft = () => {
    if (isPublished) {
      setPublishedConfirmOpen(true);
    } else {
      executeSave();
    }
  };

  const handlePublishedConfirm = () => {
    setPublishedConfirmOpen(false);
    executeSave();
  };

  const handlePreview = () => {
    submitError.clear();
    // Disable the unsaved-changes guard BEFORE the save fires. Setting state
    // synchronously here forces a re-render that propagates `enabled: false`
    // into next-navigation-guard before router.push is called below; otherwise
    // the guard intercepts the post-save navigation and the user can cancel
    // out — leaving the just-saved record behind and producing a duplicate
    // (slug, locale) error on the next attempt.
    setIsNavigatingToPreview(true);
    startTransition(async () => {
      const result = await onSaveDraft({ slug, title, content, locale });

      if ('error' in result) {
        reportSaveError(result);
        setIsNavigatingToPreview(false);
      } else {
        isSubmittedRef.current = true;
        router.push(`/admin/announcements/${result.id}/preview`);
      }
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      <AdminFormTopBar
        labels={{
          saveDraft: labels.saveDraft,
          savingDraft: labels.savingDraft,
          savePublished: labels.savePublished,
          savingPublished: labels.savingPublished,
          preview: labels.preview,
          cancel: labels.cancel,
        }}
        isPending={isPending}
        isPublished={isPublished}
        onSave={handleSaveDraft}
        onPreview={handlePreview}
        onCancel={() => router.push('/admin/announcements')}
      />

      {/* Only what no input owns (auth, a duplicate slug+locale, an
          unexpected failure) — field rejections render at their field. */}
      {submitError.formMessage && (
        <div className="px-4 py-2 shrink-0">
          <p
            ref={submitError.summaryRef}
            tabIndex={-1}
            role="alert"
            className="text-destructive text-sm"
          >
            {submitError.formMessage}
          </p>
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-6 pt-4 pb-2">
            <div className="flex items-center gap-3">
              <input
                id="announcement-slug"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder={labels.slugPlaceholder}
                aria-label={labels.slug}
                readOnly={lockSlug}
                className={`flex-1 border rounded px-3 py-1.5 text-sm text-foreground ${
                  slugError ? 'border-destructive' : 'border-border'
                } ${lockSlug ? 'bg-muted cursor-not-allowed' : 'bg-card'}`}
                maxLength={255}
                {...fieldErrorProps('announcement-slug-error', slugError)}
              />
              <select
                id="announcement-locale"
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                aria-label={labels.locale}
                disabled={lockLocale}
                className={`border rounded px-3 py-1.5 text-sm text-foreground ${
                  localeError ? 'border-destructive' : 'border-border'
                } ${lockLocale ? 'bg-muted cursor-not-allowed' : 'bg-card'}`}
                {...fieldErrorProps('announcement-locale-error', localeError)}
              >
                <option value="en">en</option>
                <option value="ja">ja</option>
                <option value="es">es</option>
                <option value="pt-BR">pt-BR</option>
              </select>
            </div>
            <FieldError id="announcement-slug-error" message={slugError} />
            <FieldError id="announcement-locale-error" message={localeError} />
          </div>

          <div className="px-6 pb-2">
            <input
              id="announcement-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={labels.titlePlaceholder}
              aria-label={labels.title}
              className={`w-full text-2xl font-bold bg-card outline-none placeholder:text-muted-foreground/50 rounded px-3 py-2 ${
                titleError ? 'border border-destructive' : 'border-none'
              }`}
              maxLength={255}
              {...fieldErrorProps('announcement-title-error', titleError)}
            />
            <FieldError id="announcement-title-error" message={titleError} />
          </div>

          <div className="flex-1 px-6 pb-4 flex flex-col min-h-0">
            <textarea
              id="announcement-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={labels.contentPlaceholder}
              aria-label={labels.content}
              className={`flex-1 w-full border rounded px-3 py-2 text-sm bg-card text-foreground resize-none ${
                contentError ? 'border-destructive' : 'border-border'
              }`}
              {...fieldErrorProps('announcement-content-error', contentError)}
            />
            <FieldError id="announcement-content-error" message={contentError} />
          </div>
        </div>
      </div>

      <UnsavedChangesDialog
        open={isBlocking}
        onConfirm={confirmNavigation}
        onCancel={cancelNavigation}
        title={labels.unsavedChangesTitle}
        message={labels.unsavedChangesMessage}
        confirmLabel={labels.unsavedChangesConfirm}
        cancelLabel={labels.unsavedChangesCancel}
      />

      <PublishedConfirmModal
        isOpen={publishedConfirmOpen}
        title={labels.publishedConfirmTitle}
        message={labels.publishedConfirmMessage}
        confirmLabel={labels.publishedConfirmConfirm}
        cancelLabel={labels.publishedConfirmCancel}
        onConfirm={handlePublishedConfirm}
        onCancel={() => setPublishedConfirmOpen(false)}
      />
    </div>
  );
}
