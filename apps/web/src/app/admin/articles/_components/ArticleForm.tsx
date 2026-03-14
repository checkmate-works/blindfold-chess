'use client';

import { useState, useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { LuSettings, LuX } from 'react-icons/lu';

import { MarkdownRenderer } from '@/app/[locale]/_components/MarkdownRenderer';

type ArticleEditData = {
  slug: string;
  title: string;
  content: string;
  locale: string;
  excerpt: string;
  description: string;
  categoryId: string;
  icon: string;
};

type ArticleFormProps = {
  defaultValues?: ArticleEditData;
  categories?: { id: string; name: string }[];
  onSaveDraft: (
    data: ArticleEditData
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
    draftSaved: string;
    preview: string;
    cancel: string;
    excerpt: string;
    excerptPlaceholder: string;
    description: string;
    descriptionPlaceholder: string;
    category: string;
    categoryNone: string;
    icon: string;
    iconPlaceholder: string;
    metadata: string;
    tabEdit: string;
    tabPreview: string;
  };
};

export function ArticleForm({
  defaultValues,
  categories = [],
  onSaveDraft,
  labels,
}: ArticleFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [metadataOpen, setMetadataOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

  const [slug, setSlug] = useState(defaultValues?.slug ?? '');
  const [title, setTitle] = useState(defaultValues?.title ?? '');
  const [content, setContent] = useState(defaultValues?.content ?? '');
  const [locale, setLocale] = useState(defaultValues?.locale ?? 'en');
  const [excerpt, setExcerpt] = useState(defaultValues?.excerpt ?? '');
  const [description, setDescription] = useState(defaultValues?.description ?? '');
  const [categoryId, setCategoryId] = useState(defaultValues?.categoryId ?? '');
  const [icon, setIcon] = useState(defaultValues?.icon ?? '');

  const buildFormData = () => ({
    slug,
    title,
    content,
    locale,
    excerpt,
    description,
    categoryId,
    icon,
  });

  const handleSaveDraft = () => {
    setError(null);
    setToastMessage(null);
    startTransition(async () => {
      const result = await onSaveDraft(buildFormData());

      if ('error' in result) {
        setError(result.error);
      } else {
        setToastMessage(labels.draftSaved);
        setTimeout(() => setToastMessage(null), 3000);
        // For new articles, update URL to edit page so subsequent saves are updates
        if (!defaultValues) {
          router.replace(`/admin/articles/${result.id}/edit`);
        }
      }
    });
  };

  const handlePublishSettings = () => {
    setError(null);
    setToastMessage(null);
    startTransition(async () => {
      const result = await onSaveDraft(buildFormData());

      if ('error' in result) {
        setError(result.error);
      } else {
        router.push(`/admin/articles/${result.id}/publish`);
      }
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Top bar */}
      <div className="flex items-center justify-end border-b border-border px-4 py-2 shrink-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMetadataOpen(!metadataOpen)}
            className="p-2 text-sm rounded border border-border hover:bg-secondary transition-colors"
            title={labels.metadata}
          >
            <LuSettings size={16} />
          </button>

          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isPending}
            className="px-4 py-1.5 text-sm rounded bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isPending ? labels.savingDraft : labels.saveDraft}
          </button>
          <button
            type="button"
            onClick={handlePublishSettings}
            disabled={isPending}
            className="px-4 py-1.5 text-sm rounded bg-card border border-primary text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
          >
            {labels.preview}
          </button>
          <button
            type="button"
            onClick={() => router.push('/admin/articles')}
            disabled={isPending}
            className="px-4 py-1.5 text-sm rounded bg-card border border-border hover:bg-secondary transition-colors"
          >
            {labels.cancel}
          </button>
        </div>
      </div>

      {error && (
        <div className="px-4 py-2 shrink-0">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-success text-success-foreground px-4 py-3 rounded-md shadow-lg text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main content area */}
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 flex flex-col min-w-0">
          {/* Slug & Locale */}
          <div className="flex items-center gap-3 px-6 pt-4 pb-2">
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder={labels.slugPlaceholder}
              aria-label={labels.slug}
              className="flex-1 border border-border rounded px-3 py-1.5 text-sm bg-card text-foreground"
              maxLength={255}
            />
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              aria-label={labels.locale}
              className="border border-border rounded px-3 py-1.5 text-sm bg-card text-foreground"
            >
              <option value="en">en</option>
              <option value="ja">ja</option>
            </select>
          </div>

          {/* Title input */}
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

          {/* Edit / Preview tabs */}
          <div className="flex items-center gap-1 px-6 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab('edit')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                activeTab === 'edit'
                  ? 'bg-secondary text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {labels.tabEdit}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                activeTab === 'preview'
                  ? 'bg-secondary text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {labels.tabPreview}
            </button>
          </div>

          {/* Content area: edit or preview */}
          {activeTab === 'edit' ? (
            <div className="flex-1 px-6 pb-4">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={labels.contentPlaceholder}
                aria-label={labels.content}
                className="w-full h-full bg-card border-none outline-none resize-none text-sm font-mono leading-relaxed placeholder:text-muted-foreground/50 rounded px-3 py-2"
              />
            </div>
          ) : (
            <div className="flex-1 px-6 pb-4 overflow-y-auto">
              {title && <h1 className="text-2xl font-bold mb-4">{title}</h1>}
              <article className="prose prose-slate dark:prose-invert max-w-none break-words">
                <MarkdownRenderer content={content} skipFirstH1={true} />
              </article>
            </div>
          )}
        </div>

        {/* Metadata side panel */}
        {metadataOpen && (
          <div className="w-80 border-l border-border overflow-y-auto shrink-0">
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{labels.metadata}</h3>
                <button
                  type="button"
                  onClick={() => setMetadataOpen(false)}
                  aria-label="Close metadata"
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <LuX size={16} />
                </button>
              </div>

              <div>
                <label htmlFor="categoryId" className="block text-sm font-medium mb-1">
                  {labels.category}
                </label>
                <select
                  id="categoryId"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full border border-border rounded px-3 py-2 text-sm bg-card text-foreground"
                >
                  <option value="">{labels.categoryNone}</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="excerpt" className="block text-sm font-medium mb-1">
                  {labels.excerpt}
                </label>
                <textarea
                  id="excerpt"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder={labels.excerptPlaceholder}
                  className="w-full border border-border rounded px-3 py-2 text-sm bg-card text-foreground resize-none"
                  rows={3}
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium mb-1">
                  {labels.description}
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={labels.descriptionPlaceholder}
                  className="w-full border border-border rounded px-3 py-2 text-sm bg-card text-foreground resize-none"
                  rows={3}
                />
              </div>

              <div>
                <label htmlFor="icon" className="block text-sm font-medium mb-1">
                  {labels.icon}
                </label>
                <input
                  id="icon"
                  type="text"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  placeholder={labels.iconPlaceholder}
                  className="w-full border border-border rounded px-3 py-2 text-sm bg-card text-foreground"
                  maxLength={10}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
