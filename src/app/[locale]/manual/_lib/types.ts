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

export type LocaleLoaders = {
  en: () => Promise<{ metadata: ManualArticleMetadata }>;
  ja: () => Promise<{ metadata: ManualArticleMetadata }>;
};

export type ContentLoaders = {
  en: () => Promise<{ default: string } | { content: string }>;
  ja: () => Promise<{ default: string } | { content: string }>;
};
