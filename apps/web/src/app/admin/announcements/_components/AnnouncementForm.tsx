'use client';

import { useRef, useState, useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import { UnsavedChangesDialog } from '@/app/_components/UnsavedChangesDialog';

type AnnouncementEditData = {
  slug: string;
  title: string;
  content: string;
  locale: string;
};

type AnnouncementFormProps = {
  defaultValues?: AnnouncementEditData;
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
    preview: string;
    cancel: string;
    backToList: string;
    unsavedChangesTitle: string;
    unsavedChangesMessage: string;
    unsavedChangesConfirm: string;
    unsavedChangesCancel: string;
  };
};

export function AnnouncementForm({
  defaultValues,
  lockSlug = false,
  lockLocale = false,
  onSaveDraft,
  labels,
}: AnnouncementFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const initialSlug = defaultValues?.slug ?? '';
  const initialTitle = defaultValues?.title ?? '';
  const initialContent = defaultValues?.content ?? '';
  const initialLocale = defaultValues?.locale ?? 'en';

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

  const handleSaveDraft = () => {
    setError(null);
    startTransition(async () => {
      const result = await onSaveDraft({ slug, title, content, locale });

      if ('error' in result) {
        setError(result.error);
      } else {
        isSubmittedRef.current = true;
        router.push('/admin/announcements');
      }
    });
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
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button
          type="button"
          onClick={() => router.push('/admin/announcements')}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {labels.backToList}
        </button>
        <h1 className="text-2xl font-bold">{labels.formTitle}</h1>
      </div>

      <div className="max-w-2xl space-y-4">
        <div>
          <label htmlFor="slug" className="block text-sm font-medium mb-1">
            {labels.slug}
          </label>
          <input
            id="slug"
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder={labels.slugPlaceholder}
            readOnly={lockSlug}
            className={`w-full border border-border rounded px-3 py-2 text-sm text-foreground ${
              lockSlug ? 'bg-muted cursor-not-allowed' : 'bg-card'
            }`}
            maxLength={255}
          />
        </div>

        <div>
          <label htmlFor="locale" className="block text-sm font-medium mb-1">
            {labels.locale}
          </label>
          <select
            id="locale"
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
            disabled={lockLocale}
            className={`w-full border border-border rounded px-3 py-2 text-sm text-foreground ${
              lockLocale ? 'bg-muted cursor-not-allowed' : 'bg-card'
            }`}
          >
            <option value="en">en</option>
            <option value="ja">ja</option>
            <option value="es">es</option>
            <option value="pt-BR">pt-BR</option>
          </select>
        </div>

        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-1">
            {labels.title}
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={labels.titlePlaceholder}
            className="w-full border border-border rounded px-3 py-2 text-sm bg-card text-foreground"
            maxLength={255}
          />
        </div>

        <div>
          <label htmlFor="content" className="block text-sm font-medium mb-1">
            {labels.content}
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={labels.contentPlaceholder}
            className="w-full border border-border rounded px-3 py-2 text-sm bg-card text-foreground resize-none"
            rows={10}
          />
        </div>

        {error && <p className="text-destructive text-sm">{error}</p>}

        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isPending}
            className="px-4 py-2 text-sm rounded bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isPending ? labels.savingDraft : labels.saveDraft}
          </button>
          <button
            type="button"
            onClick={handlePreview}
            disabled={isPending}
            className="px-4 py-2 text-sm rounded bg-card border border-primary text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
          >
            {labels.preview}
          </button>
          <button
            type="button"
            onClick={() => router.push('/admin/announcements')}
            disabled={isPending}
            className="px-4 py-2 text-sm rounded bg-card border border-border hover:bg-secondary transition-colors"
          >
            {labels.cancel}
          </button>
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
    </div>
  );
}
