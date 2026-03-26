export type ContentFormat = 'markdown' | 'tiptap_json';

/** Tiptap JSON inline mark */
export type TiptapMark = {
  type: string;
  attrs?: Record<string, unknown>;
};

/** Tiptap JSON node */
export type TiptapNode = {
  type: string;
  content?: TiptapNode[];
  text?: string;
  marks?: TiptapMark[];
  attrs?: Record<string, unknown>;
};

/** Tiptap JSON document (root node) */
export type TiptapJsonContent = {
  type: 'doc';
  content?: TiptapNode[];
};

export type ArticleEditData = {
  slug: string;
  title: string;
  content: string;
  contentJson: TiptapJsonContent | null;
  contentFormat: ContentFormat;
  locale: string;
  excerpt: string;
  description: string;
  categoryId: string;
  icon: string;
};

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
