import { extractPlainText } from './extract-plain-text';
import type { ArticleEditData, ContentFormat, TiptapJsonContent } from './types';

type BuildFormDataInput = {
  slug: string;
  title: string;
  contentFormat: ContentFormat;
  markdownContent: string;
  contentJson: TiptapJsonContent | null;
  locale: string;
  excerpt: string;
  description: string;
  categoryId: string;
  icon: string;
};

function buildMarkdownFormData(input: BuildFormDataInput): ArticleEditData {
  const { slug, title, markdownContent, locale, excerpt, description, categoryId, icon } = input;
  return {
    slug,
    title,
    content: markdownContent,
    contentJson: null,
    contentFormat: 'markdown',
    locale,
    excerpt,
    description,
    categoryId,
    icon,
  };
}

function buildTiptapFormData(input: BuildFormDataInput): ArticleEditData {
  const { slug, title, contentJson, locale, excerpt, description, categoryId, icon } = input;
  const plainText = extractPlainText(contentJson);
  return {
    slug,
    title,
    content: plainText,
    contentJson: contentJson
      ? (JSON.parse(JSON.stringify(contentJson)) as TiptapJsonContent)
      : null,
    contentFormat: 'tiptap_json',
    locale,
    excerpt,
    description,
    categoryId,
    icon,
  };
}

/**
 * Pure builder that converts `ArticleForm` internal state into an
 * `ArticleEditData` payload, branching on `contentFormat`:
 *
 * - `markdown` — `content` is the raw markdown string, `contentJson` is `null`.
 * - `tiptap_json` — `content` is the plain-text extraction (for search/SEO),
 *   `contentJson` is a deep-cloned copy of the editor's JSON document.
 */
export function buildArticleFormData(input: BuildFormDataInput): ArticleEditData {
  if (input.contentFormat === 'markdown') {
    return buildMarkdownFormData(input);
  }
  return buildTiptapFormData(input);
}

export type { BuildFormDataInput };
