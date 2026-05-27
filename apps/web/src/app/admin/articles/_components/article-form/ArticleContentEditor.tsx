'use client';

import { useCallback } from 'react';

import type { ContentFormat, TiptapJsonContent } from '../../_lib/types';
import { MarkdownEditor } from '../MarkdownEditor';
import { TiptapEditor } from '../TiptapEditor';

/**
 * The editor surface inside the article form. Switches between
 * `MarkdownEditor` (textarea + live preview) and `TiptapEditor`
 * (rich-text) based on the article's stored `contentFormat`.
 *
 * Pulled out of `ArticleForm` because the format dispatch was the
 * only place in the parent that branched on `contentFormat`, and the
 * branch carried slightly different prop sets (Markdown takes
 * tab-edit / tab-preview labels and a string content; Tiptap takes
 * an `articleId` for image uploads, an `onImageUploadError` toast
 * callback, and a JSON content). Splitting the branch off keeps the
 * parent module focused on the form-level layout (slug, title, save
 * bar, metadata panel) instead of carrying the editor's per-format
 * wiring inline.
 */
export function ArticleContentEditor({
  contentFormat,
  markdownContent,
  contentJson,
  articleId,
  labels,
  onMarkdownChange,
  onTiptapChange,
  onTiptapImageError,
}: {
  contentFormat: ContentFormat;
  markdownContent: string;
  /**
   * Tiptap document. Carried as nullable so the form state's initial
   * `null` (before the editor has emitted its first change) is
   * accepted without forcing every caller into an `?? undefined`
   * coercion. The Tiptap component itself accepts `null` as
   * "use empty document".
   */
  contentJson: TiptapJsonContent | null | undefined;
  articleId: string | undefined;
  labels: {
    content: string;
    contentPlaceholder: string;
    tabEdit: string;
    tabPreview: string;
  };
  onMarkdownChange: (value: string) => void;
  onTiptapChange: (value: TiptapJsonContent) => void;
  onTiptapImageError: (message: string) => void;
}) {
  // The Tiptap editor receives its own callback so the parent can
  // pre-process the JSON before persisting (e.g. extract plain text
  // for the search index). The intermediate wrapper avoids leaking
  // that pre-processing into the parent's inline `onChange`.
  const handleTiptapChange = useCallback(
    (json: TiptapJsonContent) => {
      onTiptapChange(json);
    },
    [onTiptapChange]
  );

  if (contentFormat === 'markdown') {
    return (
      <MarkdownEditor
        defaultContent={markdownContent}
        onChange={onMarkdownChange}
        placeholder={labels.contentPlaceholder}
        ariaLabel={labels.content}
        tabEditLabel={labels.tabEdit}
        tabPreviewLabel={labels.tabPreview}
      />
    );
  }

  return (
    <TiptapEditor
      initialContent={contentJson}
      onChange={handleTiptapChange}
      placeholder={labels.contentPlaceholder}
      ariaLabel={labels.content}
      articleId={articleId}
      onImageUploadError={onTiptapImageError}
    />
  );
}
