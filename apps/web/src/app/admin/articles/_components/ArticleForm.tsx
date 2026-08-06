'use client';

import { useCallback, useState, useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { useSubmitError } from '@/_hooks/useSubmitError';
import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import {
  FieldError,
  GenerateSlugButton,
  UnsavedChangesDialog,
  fieldErrorProps,
} from '@/app/_components';
import { AdminFormTopBar } from '@/app/admin/_components/forms';
import { LuSettings } from 'react-icons/lu';

import { useToast } from '@/app/[locale]/_contexts/ToastContext';

import { PublishedConfirmModal } from '../../_components/PublishedConfirmModal';
import { useArticleFormState } from '../_hooks/useArticleFormState';
import { buildArticleFormData } from '../_lib/build-form-data';
import type { ArticleEditData, ContentFormat } from '../_lib/types';
import { ArticleContentEditor } from './article-form/ArticleContentEditor';
import { ArticleMetadataPanel } from './article-form/ArticleMetadataPanel';

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
    generateSlugFromTitle: string;
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
/**
 * Where a rejection lands, per field named by `validateArticleData`. The
 * editor is the one that isn't an input — it anchors on its wrapper.
 */
const FIELD_ANCHOR_IDS: Record<string, string> = {
  slug: 'article-slug',
  title: 'article-title',
  locale: 'article-locale',
  content: 'article-content',
  icon: 'icon',
};

/** Fields that live in the metadata side panel, hidden until it is opened. */
const METADATA_FIELDS = new Set(['icon']);

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
  const [metadataOpen, setMetadataOpen] = useState(false);
  const [publishedConfirmOpen, setPublishedConfirmOpen] = useState(false);
  const [isNavigatingToPublish, setIsNavigatingToPublish] = useState(false);

  // This form is a full-height editor with a side panel, so a rejection
  // rendered in the strip under the top bar can sit a screen away from the
  // input it names. Show it at that input and focus it instead.
  const submitError = useSubmitError<string>((field) => FIELD_ANCHOR_IDS[field] ?? null);
  const slugError = submitError.messageFor('slug');
  const titleError = submitError.messageFor('title');
  const localeError = submitError.messageFor('locale');
  const contentError = submitError.messageFor('content');

  /**
   * Report a failed save at the field the server blamed. A metadata field is
   * only rendered while the side panel is open, so open it first — otherwise
   * the message would render into an unmounted panel and vanish.
   */
  function reportSaveError(result: { error: string; field?: string }) {
    const field = result.field && FIELD_ANCHOR_IDS[result.field] ? result.field : null;
    if (field && METADATA_FIELDS.has(field)) setMetadataOpen(true);
    submitError.report(field, result.error);
  }

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

  const redirectAfterSave = (id: string) => {
    window.location.replace(`/admin/articles/${id}/edit`);
  };

  const executeSave = () => {
    submitError.clear();
    startTransition(async () => {
      const result = await onSaveDraft(buildFormData());

      if ('error' in result) {
        reportSaveError(result);
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
    submitError.clear();
    setIsNavigatingToPublish(true);
    startTransition(async () => {
      const result = await onSaveDraft(buildFormData());

      if ('error' in result) {
        reportSaveError(result);
        setIsNavigatingToPublish(false);
      } else {
        router.push(`/admin/articles/${result.id}/publish`);
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
        onPreview={handlePublishSettings}
        onCancel={() => router.push('/admin/articles')}
        leadingActions={
          <button
            type="button"
            onClick={() => setMetadataOpen(!metadataOpen)}
            className="p-2 text-sm rounded border border-border hover:bg-secondary transition-colors"
            title={labels.metadata}
          >
            <LuSettings size={16} />
          </button>
        }
      />

      {/* Only what no input owns — a failed auth check, a duplicate
          slug+locale, an unexpected server error. Field rejections render at
          their field below. */}
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

      {/* Main content area */}
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 flex flex-col min-w-0">
          {/* Slug & Locale */}
          <div className="px-6 pt-4 pb-2">
            <div className="flex items-center gap-3">
              <input
                id="article-slug"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder={labels.slugPlaceholder}
                aria-label={labels.slug}
                className={`flex-1 border rounded px-3 py-1.5 text-sm bg-card text-foreground ${
                  slugError ? 'border-destructive' : 'border-border'
                }`}
                maxLength={255}
                {...fieldErrorProps('article-slug-error', slugError)}
              />
              <GenerateSlugButton
                title={title}
                onSlugChange={setSlug}
                label={labels.generateSlugFromTitle}
                disabled={isPending}
                size="sm"
              />
              <select
                id="article-locale"
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                aria-label={labels.locale}
                className={`border rounded px-3 py-1.5 text-sm bg-card text-foreground ${
                  localeError ? 'border-destructive' : 'border-border'
                }`}
                {...fieldErrorProps('article-locale-error', localeError)}
              >
                <option value="en">en</option>
                <option value="ja">ja</option>
              </select>
            </div>
            <FieldError id="article-slug-error" message={slugError} />
            <FieldError id="article-locale-error" message={localeError} />
          </div>

          {/* Title input */}
          <div className="px-6 pb-2">
            <input
              id="article-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={labels.titlePlaceholder}
              aria-label={labels.title}
              className={`w-full text-2xl font-bold bg-card outline-none placeholder:text-muted-foreground/50 rounded px-3 py-2 ${
                titleError ? 'border border-destructive' : 'border-none'
              }`}
              maxLength={255}
              {...fieldErrorProps('article-title-error', titleError)}
            />
            <FieldError id="article-title-error" message={titleError} />
          </div>

          {/* Editor */}
          <div
            id="article-content"
            tabIndex={-1}
            className="flex-1 px-6 pb-4 flex flex-col"
            aria-describedby={contentError ? 'article-content-error' : undefined}
          >
            <FieldError id="article-content-error" message={contentError} />
            <div className="flex-1 flex flex-col rounded bg-card">
              <ArticleContentEditor
                contentFormat={contentFormat}
                markdownContent={markdownContent}
                contentJson={contentJson}
                articleId={articleId}
                labels={{
                  content: labels.content,
                  contentPlaceholder: labels.contentPlaceholder,
                  tabEdit: labels.tabEdit,
                  tabPreview: labels.tabPreview,
                }}
                onMarkdownChange={setMarkdownContent}
                onTiptapChange={setContentJson}
                onTiptapImageError={(message) => showToast(message, 'error')}
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
            iconError={submitError.messageFor('icon')}
            onClose={() => setMetadataOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
