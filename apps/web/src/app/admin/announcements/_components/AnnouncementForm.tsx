'use client';

import { useRef, useState, useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import { UnsavedChangesDialog } from '@/app/_components/UnsavedChangesDialog';

import { useToast } from '@/app/[locale]/_contexts/ToastContext';

import { PublishedConfirmModal } from '../../_components/PublishedConfirmModal';
import { AnnouncementFormTopBar } from './announcement-form/AnnouncementFormTopBar';

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
  const [error, setError] = useState<string | null>(null);
  const [publishedConfirmOpen, setPublishedConfirmOpen] = useState(false);

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
    setError(null);
    startTransition(async () => {
      const result = await onSaveDraft({ slug, title, content, locale });

      if ('error' in result) {
        setError(result.error);
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
    setError(null);
    startTransition(async () => {
      const result = await onSaveDraft({ slug, title, content, locale });

      if ('error' in result) {
        setError(result.error);
      } else {
        isSubmittedRef.current = true;
        router.push(`/admin/announcements/${result.id}/preview`);
      }
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <AnnouncementFormTopBar
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

      {error && (
        <div className="px-4 py-2 shrink-0">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center gap-3 px-6 pt-4 pb-2">
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder={labels.slugPlaceholder}
              aria-label={labels.slug}
              readOnly={lockSlug}
              className={`flex-1 border border-border rounded px-3 py-1.5 text-sm text-foreground ${
                lockSlug ? 'bg-muted cursor-not-allowed' : 'bg-card'
              }`}
              maxLength={255}
            />
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              aria-label={labels.locale}
              disabled={lockLocale}
              className={`border border-border rounded px-3 py-1.5 text-sm text-foreground ${
                lockLocale ? 'bg-muted cursor-not-allowed' : 'bg-card'
              }`}
            >
              <option value="en">en</option>
              <option value="ja">ja</option>
              <option value="es">es</option>
              <option value="pt-BR">pt-BR</option>
            </select>
          </div>

          <div className="px-6 pb-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={labels.titlePlaceholder}
              aria-label={labels.title}
              className="w-full text-2xl font-bold bg-card border-none outline-none placeholder:text-muted-foreground/50 rounded px-3 py-2"
              maxLength={255}
            />
          </div>

          <div className="flex-1 px-6 pb-4 flex flex-col min-h-0">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={labels.contentPlaceholder}
              aria-label={labels.content}
              className="flex-1 w-full border border-border rounded px-3 py-2 text-sm bg-card text-foreground resize-none"
            />
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
