export interface ArticleMetadata {
  title: string;
  slug: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: readonly string[];
  publishedAt: string;
  excerpt: string;
  order?: number;
}

export interface Article {
  metadata: ArticleMetadata;
  content: string;
}

// Content registry for markdown files
const contentRegistry: Record<string, Record<'en' | 'ja', () => Promise<string>>> = {
  'algebraic-notation': {
    en: () => import('../content/learn/algebraic-notation/en').then((m) => m.default),
    ja: () => import('../content/learn/algebraic-notation/ja').then((m) => m.default),
  },
};

// Static article registry by locale
export const articleRegistry = {
  'algebraic-notation': {
    en: () => import('../content/learn/algebraic-notation/metadata.en'),
    ja: () => import('../content/learn/algebraic-notation/metadata.ja'),
  },
} as const;

export type ArticleSlug = keyof typeof articleRegistry;

export function getAvailableArticles(): string[] {
  return Object.keys(articleRegistry);
}

export async function getArticle(slug: string, locale: 'en' | 'ja'): Promise<Article | null> {
  try {
    if (!(slug in articleRegistry)) {
      return null;
    }

    // Import metadata using registry with locale
    const articleData = articleRegistry[slug as keyof typeof articleRegistry];
    if (!(locale in articleData)) {
      return null;
    }

    const metadataModule = await articleData[locale as keyof typeof articleData]();
    const metadata = metadataModule.metadata;

    // Import markdown content
    if (!(slug in contentRegistry) || !(locale in contentRegistry[slug])) {
      return null;
    }

    const content = await contentRegistry[slug][locale]();

    return {
      metadata,
      content,
    };
  } catch (error) {
    console.error(`Error loading article ${slug}:`, error);
    return null;
  }
}

export async function getAllArticles(locale: 'en' | 'ja'): Promise<ArticleMetadata[]> {
  const slugs = getAvailableArticles();
  const articles: ArticleMetadata[] = [];

  for (const slug of slugs) {
    try {
      const articleData = articleRegistry[slug as keyof typeof articleRegistry];
      if (locale in articleData) {
        const metadataModule = await articleData[locale as keyof typeof articleData]();
        articles.push(metadataModule.metadata);
      }
    } catch (error) {
      console.error(`Error loading metadata for ${slug}:`, error);
    }
  }

  // Sort by custom order first, then by published date (newest first)
  return articles.sort((a, b) => {
    // If both have order, sort by order (ascending)
    if (a.order !== undefined && b.order !== undefined) {
      return a.order - b.order;
    }
    // If only one has order, prioritize it
    if (a.order !== undefined) return -1;
    if (b.order !== undefined) return 1;
    // If neither has order, sort by published date (newest first)
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });
}
