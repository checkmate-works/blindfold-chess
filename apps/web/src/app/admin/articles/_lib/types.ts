export type ArticleEditData = {
  slug: string;
  title: string;
  content: string;
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
  locale: string;
  status: string;
  pinnedAt: string | null;
  publishedAt: string | null;
  excerpt: string | null;
  description: string | null;
  categoryId: string | null;
  icon: string | null;
};
