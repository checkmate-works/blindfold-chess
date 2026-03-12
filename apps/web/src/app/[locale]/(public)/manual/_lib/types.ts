export type ManualArticleMetadata = {
  slug: string;
  title: string;
  excerpt: string;
  order?: number;
  tags: string[];
};

export type ManualArticle = {
  metadata: ManualArticleMetadata;
  content: string;
};

export const MANUAL_ARTICLE_SLUGS = {
  ABOUT_THIS_WEBSITE: 'about-this-website',
  CHANGING_PIECE_APPEARANCE: 'changing-piece-appearance',
  DATA_HANDLING_CAUTION: 'data-handling-caution',
} as const;
