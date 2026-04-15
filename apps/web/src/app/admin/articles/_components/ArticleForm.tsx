'use client';

import { useCallback, useState, useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import { UnsavedChangesDialog } from '@/app/_components';

import { useToast } from '@/app/[locale]/_contexts/ToastContext';

import { useArticleFormState } from '../_hooks/useArticleFormState';
import { buildArticleFormData } from '../_lib/build-form-data';
import type { ArticleEditData, ContentFormat, TiptapJsonContent } from '../_lib/types';
import { MarkdownEditor } from './MarkdownEditor';
import { TiptapEditor } from './TiptapEditor';
import { ArticleFormTopBar } from './article-form/ArticleFormTopBar';
import { ArticleMetadataPanel } from './article-form/ArticleMetadataPanel';
import { PublishedConfirmModal } from './article-form/PublishedConfirmModal';

type ArticleFormProps = {
  articleId?: string;
  contentFormat?: ContentFormat;
  isPublished?: boolean;
  defaultValues?: ArticleEditData;
  defaultSlug?: string;
  defaultLocale?: string;
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
    unsavedChangesTitle: string;
    unsavedChangesMessage: string;
    unsavedChangesConfirm: string;
    unsavedChangesCancel: string;
    savePublished: string;
    savingPublished: string;
    publishedSaved: string;
    publishedConfirmTitle: string;
    publishedConfirmMessage: string;
    publishedConfirmConfirm: string;
    publishedConfirmCancel: string;
  };
};

/**
 * Main article editor form used for both creating and editing articles.
 *
 * Renders a full-height editor layout with:
 * - Top bar: save draft, publish settings, cancel buttons
 * - Slug + locale inputs
 * - Title input
 * - Tiptap rich-text editor (always `tiptap_json` format)
 * - Collapsible metadata side panel (category, excerpt, description, icon)
 *
 * @remarks
 * - `contentFormat` in `buildFormData()` is set based on the `contentFormat`
 *   prop: `'markdown'` articles produce `contentFormat: 'markdown'` with the
 *   raw Markdown string in `content`, while `'tiptap_json'` articles produce
 *   `contentFormat: 'tiptap_json'` with the Tiptap JSON document in `contentJson`.
 * - Markdown articles are edited via a dedicated `MarkdownEditor` (textarea
 *   with live preview), while Tiptap articles use the rich-text `TiptapEditor`.
 * - Plain text is extracted from the Tiptap JSON via `extractPlainText()`
 *   and stored in the `content` field for full-text search compatibility.
 */
export function ArticleForm({
  articleId,
  contentFormat = 'tiptap_json',
  isPublished = false,
  defaultValues,
  defaultSlug,
  defaultLocale,
  categories = [],
  onSaveDraft,
  labels,
}: ArticleFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [metadataOpen, setMetadataOpen] = useState(false);
  const [publishedConfirmOpen, setPublishedConfirmOpen] = useState(false);
  const [isNavigatingToPublish, setIsNavigatingToPublish] = useState(false);

  const formState = useArticleFormState({
    contentFormat,
    defaultValues,
    defaultSlug,
    defaultLocale,
  });

  const {
    slug,
    title,
    contentJson,
    markdownContent,
    locale,
    excerpt,
    description,
    categoryId,
    icon,
    setSlug,
    setTitle,
    setContentJson,
    setMarkdownContent,
    setLocale,
    setExcerpt,
    setDescription,
    setCategoryId,
    setIcon,
    isDirty,
  } = formState;

  const {
    isBlocking,
    confirm: confirmNavigation,
    cancel: cancelNavigation,
  } = useUnsavedChanges({ isDirty: isDirty && !isNavigatingToPublish });

  const buildFormData = useCallback(
    (): ArticleEditData =>
      buildArticleFormData({
        slug,
        title,
        contentFormat,
        markdownContent,
        contentJson,
        locale,
        excerpt,
        description,
        categoryId,
        icon,
      }),
    [
      slug,
      title,
      contentFormat,
      markdownContent,
      contentJson,
      locale,
      excerpt,
      description,
      categoryId,
      icon,
    ]
  );

  const handleContentChange = useCallback(
    (json: TiptapJsonContent) => {
      setContentJson(json);
    },
    [setContentJson]
  );

  const redirectAfterSave = (id: string) => {
    window.location.replace(`/admin/articles/${id}/edit`);
  };

  const executeSave = () => {
    setError(null);
    startTransition(async () => {
      const result = await onSaveDraft(buildFormData());

      if ('error' in result) {
        setError(result.error);
      } else {
        showToast(isPublished ? labels.publishedSaved : labels.draftSaved, 'success');
        // For new articles, redirect to edit page so subsequent saves are updates
        if (!defaultValues) {
          redirectAfterSave(result.id);
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

  const handlePublishSettings = () => {
    setError(null);
    setIsNavigatingToPublish(true);
    startTransition(async () => {
      const result = await onSaveDraft(buildFormData());

      if ('error' in result) {
        setError(result.error);
        setIsNavigatingToPublish(false);
      } else {
        router.push(`/admin/articles/${result.id}/publish`);
      }
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <ArticleFormTopBar
        labels={{
          metadata: labels.metadata,
          saveDraft: labels.saveDraft,
          savingDraft: labels.savingDraft,
          savePublished: labels.savePublished,
          savingPublished: labels.savingPublished,
          preview: labels.preview,
          cancel: labels.cancel,
        }}
        isPending={isPending}
        isPublished={isPublished}
        onToggleMetadata={() => setMetadataOpen(!metadataOpen)}
        onSave={handleSaveDraft}
        onPublishSettings={handlePublishSettings}
        onCancel={() => router.push('/admin/articles')}
      />

      {error && (
        <div className="px-4 py-2 shrink-0">
          <p className="text-destructive text-sm">{error}</p>
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

          {/* Editor */}
          <div className="flex-1 px-6 pb-4 flex flex-col">
            <div className="flex-1 flex flex-col rounded bg-card">
              {contentFormat === 'markdown' ? (
                <MarkdownEditor
                  defaultContent={markdownContent}
                  onChange={setMarkdownContent}
                  placeholder={labels.contentPlaceholder}
                  ariaLabel={labels.content}
                  tabEditLabel={labels.tabEdit}
                  tabPreviewLabel={labels.tabPreview}
                />
              ) : (
                <TiptapEditor
                  initialContent={contentJson}
                  onChange={handleContentChange}
                  placeholder={labels.contentPlaceholder}
                  ariaLabel={labels.content}
                  articleId={articleId}
                  onImageUploadError={(message) => showToast(message, 'error')}
                />
              )}
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

        {metadataOpen && (
          <ArticleMetadataPanel
            labels={{
              metadata: labels.metadata,
              category: labels.category,
              categoryNone: labels.categoryNone,
              excerpt: labels.excerpt,
              excerptPlaceholder: labels.excerptPlaceholder,
              description: labels.description,
              descriptionPlaceholder: labels.descriptionPlaceholder,
              icon: labels.icon,
              iconPlaceholder: labels.iconPlaceholder,
            }}
            categories={categories}
            categoryId={categoryId}
            excerpt={excerpt}
            description={description}
            icon={icon}
            onCategoryIdChange={setCategoryId}
            onExcerptChange={setExcerpt}
            onDescriptionChange={setDescription}
            onIconChange={setIcon}
            onClose={() => setMetadataOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
