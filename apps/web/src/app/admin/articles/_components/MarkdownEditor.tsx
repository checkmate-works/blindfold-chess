'use client';

import { useState } from 'react';

import { MarkdownRenderer } from '@/app/_components/MarkdownRenderer';

/**
 * Props for the Markdown editor component.
 *
 * @remarks
 * Unlike `TiptapEditorProps`, this editor does not support image upload
 * or rich-text extensions. Content is edited as raw Markdown text in a
 * `<textarea>` and previewed via `MarkdownRenderer`.
 */
type MarkdownEditorProps = {
  defaultContent?: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  tabEditLabel?: string;
  tabPreviewLabel?: string;
};

/**
 * Markdown editor with edit/preview tabs for authoring Markdown articles.
 *
 * Renders a tabbed interface with:
 * - **Edit tab**: monospace `<textarea>` for raw Markdown input
 * - **Preview tab**: live-rendered preview via `MarkdownRenderer`
 *
 * Used by `ArticleForm` when `contentFormat` is `'markdown'`.
 */
export function MarkdownEditor({
  defaultContent = '',
  onChange,
  placeholder = '',
  ariaLabel,
  tabEditLabel = 'Edit',
  tabPreviewLabel = 'Preview',
}: MarkdownEditorProps) {
  const [content, setContent] = useState(defaultContent);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

  const handleChange = (value: string) => {
    setContent(value);
    onChange(value);
  };

  return (
    <div className="relative flex flex-col flex-1">
      {/* Tab bar */}
      <div className="flex border-b border-border shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('edit')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'edit'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {tabEditLabel}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('preview')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'preview'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {tabPreviewLabel}
        </button>
      </div>

      {/* Content area */}
      {activeTab === 'edit' ? (
        <textarea
          value={content}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          aria-label={ariaLabel}
          className="flex-1 w-full resize-none bg-card text-foreground px-12 py-6 font-mono text-sm leading-relaxed focus:outline-none"
          data-testid="markdown-editor"
        />
      ) : (
        <div className="flex-1 overflow-y-auto px-12 py-6">
          {content ? (
            <MarkdownRenderer content={content} />
          ) : (
            <p className="text-muted-foreground italic">{placeholder}</p>
          )}
        </div>
      )}
    </div>
  );
}
