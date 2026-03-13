'use client';

import { useState, useTransition } from 'react';

import { useRouter } from 'next/navigation';

type AnnouncementFormData = {
  slug: string;
  title: string;
  content: string;
  locale: string;
  status: string;
  visibility: string;
  pinnedAt: string | null;
  publishedAt: string | null;
};

type AnnouncementFormProps = {
  defaultValues?: AnnouncementFormData;
  onSubmit: (
    data: AnnouncementFormData
  ) => Promise<{ success: true; id?: string } | { error: string }>;
  labels: {
    formTitle: string;
    slug: string;
    slugPlaceholder: string;
    title: string;
    titlePlaceholder: string;
    content: string;
    contentPlaceholder: string;
    locale: string;
    status: string;
    visibility: string;
    pinnedAt: string;
    publishedAt: string;
    save: string;
    saving: string;
    cancel: string;
    backToList: string;
    draft: string;
    published: string;
    public: string;
    members: string;
  };
};

export function AnnouncementForm({ defaultValues, onSubmit, labels }: AnnouncementFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [slug, setSlug] = useState(defaultValues?.slug ?? '');
  const [title, setTitle] = useState(defaultValues?.title ?? '');
  const [content, setContent] = useState(defaultValues?.content ?? '');
  const [locale, setLocale] = useState(defaultValues?.locale ?? 'en');
  const [status, setStatus] = useState(defaultValues?.status ?? 'draft');
  const [visibility, setVisibility] = useState(defaultValues?.visibility ?? 'public');
  const [pinnedAt, setPinnedAt] = useState(defaultValues?.pinnedAt ?? '');
  const [publishedAt, setPublishedAt] = useState(defaultValues?.publishedAt ?? '');

  const handleSubmit = () => {
    setError(null);
    startTransition(async () => {
      const result = await onSubmit({
        slug,
        title,
        content,
        locale,
        status,
        visibility,
        pinnedAt: pinnedAt || null,
        publishedAt: publishedAt || null,
      });

      if ('error' in result) {
        setError(result.error);
      } else {
        router.push('/admin/announcements');
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
            className="w-full border border-border rounded px-3 py-2 text-sm bg-background text-foreground"
            maxLength={255}
          />
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
            className="w-full border border-border rounded px-3 py-2 text-sm bg-background text-foreground"
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
            className="w-full border border-border rounded px-3 py-2 text-sm bg-background text-foreground resize-none"
            rows={10}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="locale" className="block text-sm font-medium mb-1">
              {labels.locale}
            </label>
            <select
              id="locale"
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              className="w-full border border-border rounded px-3 py-2 text-sm bg-background text-foreground"
            >
              <option value="en">en</option>
              <option value="ja">ja</option>
            </select>
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium mb-1">
              {labels.status}
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full border border-border rounded px-3 py-2 text-sm bg-background text-foreground"
            >
              <option value="draft">{labels.draft}</option>
              <option value="published">{labels.published}</option>
            </select>
          </div>

          <div>
            <label htmlFor="visibility" className="block text-sm font-medium mb-1">
              {labels.visibility}
            </label>
            <select
              id="visibility"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              className="w-full border border-border rounded px-3 py-2 text-sm bg-background text-foreground"
            >
              <option value="public">{labels.public}</option>
              <option value="members_only">{labels.members}</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="pinnedAt" className="block text-sm font-medium mb-1">
              {labels.pinnedAt}
            </label>
            <input
              id="pinnedAt"
              type="datetime-local"
              value={pinnedAt}
              onChange={(e) => setPinnedAt(e.target.value)}
              className="w-full border border-border rounded px-3 py-2 text-sm bg-background text-foreground"
            />
          </div>

          <div>
            <label htmlFor="publishedAt" className="block text-sm font-medium mb-1">
              {labels.publishedAt}
            </label>
            <input
              id="publishedAt"
              type="datetime-local"
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
              className="w-full border border-border rounded px-3 py-2 text-sm bg-background text-foreground"
            />
          </div>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="px-4 py-2 text-sm rounded bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isPending ? labels.saving : labels.save}
          </button>
          <button
            type="button"
            onClick={() => router.push('/admin/announcements')}
            disabled={isPending}
            className="px-4 py-2 text-sm rounded border border-border hover:bg-secondary transition-colors"
          >
            {labels.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}
