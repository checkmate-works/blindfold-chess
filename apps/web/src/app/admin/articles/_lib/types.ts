/**
 * Discriminator for how an article's body is stored and rendered.
 *
 * - `'markdown'`   — Legacy format. Body is stored as a Markdown string in `articles.content`.
 *                     Rendered on public pages via `MarkdownRenderer` (react-markdown).
 *                     Editable in the admin UI via the `MarkdownEditor` (textarea with preview).
 * - `'tiptap_json'` — Rich-editor format. Structured JSON is stored in `articles.content_json`;
 *                      a plain-text fallback is kept in `articles.content` for full-text search
 *                      and SEO description generation. Rendered via `TiptapRenderer` (custom
 *                      server component) on public pages. Editable in the admin UI via the
 *                      Tiptap-based `ArticleForm`.
 */
export type ContentFormat = 'markdown' | 'tiptap_json';

/** Tiptap JSON inline mark (bold, italic, link, code, strike, etc.) */
export type TiptapMark = {
  type: string;
  attrs?: Record<string, unknown>;
};

/**
 * Tiptap JSON node — recursive structure representing a single editor node.
 *
 * Leaf nodes have `text` (inline text) or are atom nodes (image, youtube, twitterEmbed).
 * Branch nodes have `content` arrays containing child nodes.
 */
export type TiptapNode = {
  type: string;
  content?: TiptapNode[];
  text?: string;
  marks?: TiptapMark[];
  attrs?: Record<string, unknown>;
};

/** Tiptap JSON document (root node wrapping the entire editor content) */
export type TiptapJsonContent = {
  type: 'doc';
  content?: TiptapNode[];
};

/**
 * Data shape used by the admin article editor form (`ArticleForm`).
 *
 * This is the client-side form state that gets passed to Server Actions
 * (`createArticle` / `updateArticle`) after being merged with publish
 * metadata (status, pinnedAt, publishedAt).
 */
export type ArticleEditData = {
  slug: string;
  title: string;
  /** Plain-text extraction of contentJson, used for search and description fallback */
  content: string;
  contentJson: TiptapJsonContent | null;
  contentFormat: ContentFormat;
  locale: string;
  excerpt: string;
  description: string;
  categoryId: string;
  icon: string;
};

/**
 * Data shape accepted by article mutation Server Actions
 * (`createArticle`, `updateArticle`).
 *
 * Extends `ArticleEditData` with publish-related fields (status, pinnedAt,
 * publishedAt) and allows nullable metadata fields.
 */
export type ArticleMutationData = {
  slug: string;
  title: string;
  content: string;
  contentJson: TiptapJsonContent | null;
  contentFormat: ContentFormat;
  locale: string;
  status: string;
  pinnedAt: string | null;
  publishedAt: string | null;
  excerpt: string | null;
  description: string | null;
  categoryId: string | null;
  icon: string | null;
};
