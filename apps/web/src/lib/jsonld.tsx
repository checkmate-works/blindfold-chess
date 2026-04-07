import { AUTHOR_NAME, SITE_URL } from '@/config';

const LANGUAGE_MAP: Record<string, string> = { en: 'en-US', ja: 'ja-JP', es: 'es-ES', pt: 'pt-BR' };

/**
 * Renders JSON-LD structured data as a script tag
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}

/**
 * WebSite schema for the root layout
 * @see https://schema.org/WebSite
 */
export function generateWebSiteSchema(locale: string, brandName: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: brandName,
    url: SITE_URL,
    inLanguage: LANGUAGE_MAP[locale] ?? 'en-US',
    publisher: {
      '@type': 'Organization',
      name: AUTHOR_NAME,
      url: SITE_URL,
    },
  };
}

/**
 * Organization schema
 * @see https://schema.org/Organization
 */
export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: AUTHOR_NAME,
    url: SITE_URL,
    logo: {
      '@type': 'ImageObject',
      url: `${SITE_URL}/logo.png`,
      width: 512,
      height: 512,
    },
    description: 'CheckmateWorks builds tools and training apps for chess players.',
  };
}

/**
 * WebApplication schema for the home page
 * @see https://schema.org/WebApplication
 */
export function generateWebApplicationSchema(locale: string, brandName: string) {
  const descriptionMap: Record<string, string> = {
    en: 'A free training app for blindfold chess',
    ja: '目隠しチェスの無料練習アプリ',
    es: 'Una aplicación gratuita de entrenamiento para ajedrez a ciegas',
    pt: 'Um aplicativo gratuito de treinamento para xadrez às cegas',
  };
  const description = descriptionMap[locale] ?? descriptionMap.en;

  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: brandName,
    url: SITE_URL,
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    description,
    inLanguage: Object.values(LANGUAGE_MAP),
  };
}

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type ListItemWithUrl = {
  '@type': string;
  position: number;
  name: string;
  item: string;
};

type ListItemWithoutUrl = {
  '@type': string;
  position: number;
  name: string;
};

type ListItem = ListItemWithUrl | ListItemWithoutUrl;

/**
 * BreadcrumbList schema
 * @see https://schema.org/BreadcrumbList
 */
export function generateBreadcrumbListSchema(
  items: BreadcrumbItem[],
  locale: string,
  brandName: string
) {
  const baseUrl = SITE_URL;
  const localePrefix = `/${locale}`;

  // Start with home
  const listItems: ListItem[] = [
    {
      '@type': 'ListItem',
      position: 1,
      name: brandName,
      item: `${baseUrl}${localePrefix}`,
    },
  ];

  // Add remaining items
  items.forEach((item, index) => {
    const position = index + 2;

    if (item.href) {
      listItems.push({
        '@type': 'ListItem',
        position,
        name: item.label,
        item: `${baseUrl}${localePrefix}${item.href}`,
      });
    } else {
      listItems.push({
        '@type': 'ListItem',
        position,
        name: item.label,
      });
    }
  });

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: listItems,
  };
}

export type FAQItemData = {
  question: string;
  answer: string;
};

/**
 * FAQPage schema
 * @see https://schema.org/FAQPage
 */
export function generateFAQPageSchema(items: FAQItemData[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

export type ArticleData = {
  title: string;
  description: string;
  slug: string;
  category: string;
  publishedAt: string;
  locale: string;
};

/**
 * Article schema for learn articles
 * @see https://schema.org/Article
 */
export function generateArticleSchema(article: ArticleData) {
  const articleUrl = `${SITE_URL}/${article.locale}/learn/${article.category}/${article.slug}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    datePublished: article.publishedAt,
    author: {
      '@type': 'Organization',
      name: AUTHOR_NAME,
      url: SITE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: AUTHOR_NAME,
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': articleUrl,
    },
    inLanguage: LANGUAGE_MAP[article.locale] ?? 'en-US',
  };
}

export type BlogPostData = {
  title: string;
  description: string;
  slug: string;
  publishedAt: Date | null;
  locale: string;
};

/**
 * BlogPosting schema for blog posts
 * @see https://schema.org/BlogPosting
 */
export function generateBlogPostingSchema(post: BlogPostData) {
  const postUrl = `${SITE_URL}/${post.locale}/articles/${post.slug}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt ? post.publishedAt.toISOString() : undefined,
    author: {
      '@type': 'Organization',
      name: AUTHOR_NAME,
      url: SITE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: AUTHOR_NAME,
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': postUrl,
    },
    inLanguage: LANGUAGE_MAP[post.locale] ?? 'en-US',
  };
}

/**
 * DefinedTermSet schema
 * @see https://schema.org/DefinedTermSet
 */
export function generateDefinedTermSetSchema(params: {
  name: string;
  description: string;
  url: string;
  inLanguage: string;
  terms: Array<{ name: string; description: string; url: string }>;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    name: params.name,
    description: params.description,
    url: params.url,
    inLanguage: params.inLanguage,
    hasDefinedTerm: params.terms.map((term) => ({
      '@type': 'DefinedTerm',
      name: term.name,
      description: term.description,
      url: term.url,
      inDefinedTermSet: params.url,
    })),
  };
}

export type ItemListItemData = {
  name: string;
  url: string;
};

/**
 * ItemList schema
 * @see https://schema.org/ItemList
 */
export function generateItemListSchema(items: ItemListItemData[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: item.url,
    })),
  };
}
