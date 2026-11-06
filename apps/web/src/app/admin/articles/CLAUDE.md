# Article Management (記事管理)

Admin CRUD for the articles published on the public `/articles` pages.

## Where things live

| Layer                 | Path                                                          | Description                                                       |
| --------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------- |
| **DB schema**         | `src/lib/db/schema/articles.ts` (`articles`, `articleImages`) | Drizzle table definitions. `articles` stores body in dual format. |
| **Types**             | `_lib/types.ts`                                               | `ContentFormat`, Tiptap JSON types, form/mutation data shapes.    |
| **Validation**        | `_lib/validation.ts`                                          | `validateArticleData()` — shared by create & update actions.      |
| **Server Actions**    | `_actions/{create,update,delete}Article.ts`                   | Mutation entry points (admin-guarded).                            |
| **Editor form**       | `_components/ArticleForm.tsx`                                 | Full-height Tiptap editor layout with metadata side panel.        |
| **Tiptap extensions** | `_components/tiptap-extensions.ts`                            | StarterKit + Link, Image, YouTube, XEmbed.                        |
| **Image upload**      | `_hooks/useImageUpload.ts`                                    | Client-side upload hook (placeholder → replace pattern).          |
| **Image API**         | `src/app/api/admin/articles/[id]/images/route.ts`             | POST/DELETE for Supabase Storage + `article_images` tracking.     |
| **Admin list page**   | `page.tsx`                                                    | Table listing all articles with edit/delete actions.              |
| **Publish form**      | `_components/ArticlePublishForm.tsx`                          | Set `publishedAt`, `pinnedAt`, and publish.                       |
| **Public detail**     | `src/app/[locale]/(public)/articles/[slug]/page.tsx`          | Renders article body based on `contentFormat`.                    |
| **Tiptap renderer**   | `src/app/[locale]/_components/TiptapRenderer.tsx`             | Server component — maps Tiptap JSON to React (no editor bundle).  |
| **Markdown renderer** | `src/app/_components/MarkdownRenderer.tsx`                    | Client component — `react-markdown` with GFM, KaTeX, custom imgs. |
| **Cache purge**       | `_lib/revalidate-public.ts`                                   | Immediate purge of a public article slug after an admin mutation. |

## Content format (`content_format`)

The `articles` table has a `content_format` column (`varchar(20)`, default `'markdown'`) that determines how the article body is stored and rendered:

| Format        | `content` column                     | `content_json` column | Admin editor support | Public renderer    |
| ------------- | ------------------------------------ | --------------------- | -------------------- | ------------------ |
| `markdown`    | Markdown source (primary body)       | `NULL`                | **Not supported**    | `MarkdownRenderer` |
| `tiptap_json` | Plain-text fallback (for search/SEO) | Tiptap JSON document  | Supported            | `TiptapRenderer`   |

- The admin editor (`ArticleForm`) always sets `contentFormat: 'tiptap_json'` in `buildFormData()`. There is no UI toggle for format selection.
- When a `markdown` article is loaded for editing, `contentJson` is `null`, so the Tiptap editor starts empty — the original Markdown content is **not** converted to Tiptap JSON.
- The public article detail page branches on `contentFormat`: `tiptap_json` articles use `TiptapRenderer`; all others fall back to `MarkdownRenderer`.

## Rich editor (Tiptap)

The admin editor uses **Tiptap v2** (`@tiptap/react`) with these extensions (configured in `_components/tiptap-extensions.ts`):

| Extension      | Node/Mark name | Features                                                                 |
| -------------- | -------------- | ------------------------------------------------------------------------ |
| StarterKit     | (multiple)     | Paragraph, heading (h2/h3), bold, italic, strike, code, lists, etc.      |
| Link           | `link`         | Inline hyperlinks. Click disabled in editor; opens in new tab on render. |
| Placeholder    | —              | Ghost placeholder text when editor is empty.                             |
| ResizableImage | `image`        | Extended Image with `size` (large/small) + `align` (left/center/right).  |
| Youtube        | `youtube`      | YouTube embed with privacy-enhanced URLs (`youtube-nocookie.com`).       |
| XEmbed         | `twitterEmbed` | X (formerly Twitter) embed. Name kept as `twitterEmbed` for compat.      |

Editor UI components: `BubbleToolbar` (floating toolbar on text selection), `PlusMenu` (floating "+" on empty paragraphs for inserting blocks), `ImageNodeView` (size/align toggle), `YoutubeNodeView` / `XEmbedNodeView` (embed previews).

Image upload flow (`useImageUpload`):

1. Image selected via PlusMenu, drag-and-drop, or paste.
2. A 1x1 transparent GIF placeholder is inserted at cursor position.
3. File is POSTed to `/api/admin/articles/[id]/images` (multipart/form-data).
4. API validates (MIME type, binary signature, 5 MB limit), uploads to Supabase Storage (`article-images/{articleId}/{timestamp}.{ext}`), and records in `article_images` table.
5. On success, placeholder is replaced with the public URL. On failure, placeholder is removed.
6. Image upload is disabled until the article has been saved (requires `articleId`).

## If Markdown editing is ever added to the admin UI

1. **Format-aware editor routing** — The edit page (`[id]/edit/page.tsx`) needs to check `article.contentFormat` and render either the Tiptap editor or a Markdown editor.
2. **Preserve content_format** — When saving a markdown article, the action must keep `contentFormat: 'markdown'`. `ArticleForm.buildFormData()` currently hardcodes `'tiptap_json'`.
3. **Migration path** — Consider one-way migration from Markdown to Tiptap JSON (convert on edit), which avoids maintaining two editor stacks but needs a converter.
4. **content vs. contentJson** — For `markdown` articles, `content` is the source of truth and `contentJson` stays `null`. Validation already allows empty `content` only for `tiptap_json`.
5. **Image handling** — Markdown articles use inline image URLs. `useImageUpload` is Tiptap-specific; a Markdown editor needs its own insertion (`![](url)` at cursor).
6. **Preview rendering** — `MarkdownRenderer` can be reused for live preview.
