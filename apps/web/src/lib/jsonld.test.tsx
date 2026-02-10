import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  ArticleData,
  BlogPostData,
  BreadcrumbItem,
  FAQItemData,
  generateArticleSchema,
  generateBlogPostingSchema,
  generateBreadcrumbListSchema,
  generateFAQPageSchema,
  generateOrganizationSchema,
  generateWebSiteSchema,
} from './jsonld';

describe('JSON-LD Schema Generators', () => {
  const originalEnv = process.env.NEXT_PUBLIC_SITE_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://www.blindfold-chess.online';
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = originalEnv;
  });

  describe('generateWebSiteSchema', () => {
    it('should generate correct schema for English locale', () => {
      const schema = generateWebSiteSchema('en');

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('WebSite');
      expect(schema.name).toBe('Blindfold Chess');
      expect(schema.url).toBe('https://www.blindfold-chess.online');
      expect(schema.inLanguage).toBe('en-US');
      expect(schema.publisher).toEqual({
        '@type': 'Organization',
        name: 'CheckmateWorks',
        url: 'https://www.blindfold-chess.online',
      });
    });

    it('should generate correct schema for Japanese locale', () => {
      const schema = generateWebSiteSchema('ja');

      expect(schema.inLanguage).toBe('ja-JP');
    });

    it('should default to en-US for unknown locale', () => {
      const schema = generateWebSiteSchema('fr');

      expect(schema.inLanguage).toBe('en-US');
    });
  });

  describe('generateOrganizationSchema', () => {
    it('should generate correct organization schema', () => {
      const schema = generateOrganizationSchema();

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('Organization');
      expect(schema.name).toBe('CheckmateWorks');
      expect(schema.url).toBe('https://www.blindfold-chess.online');
      expect(schema.logo).toBe('https://www.blindfold-chess.online/logo.png');
    });
  });

  describe('generateBreadcrumbListSchema', () => {
    it('should generate schema with home as first item', () => {
      const items: BreadcrumbItem[] = [];
      const schema = generateBreadcrumbListSchema(items, 'en');

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('BreadcrumbList');
      expect(schema.itemListElement).toHaveLength(1);
      expect(schema.itemListElement[0]).toEqual({
        '@type': 'ListItem',
        position: 1,
        name: 'Blindfold Chess',
        item: 'https://www.blindfold-chess.online/en',
      });
    });

    it('should generate schema with single item', () => {
      const items: BreadcrumbItem[] = [{ label: 'Learn', href: '/learn' }];
      const schema = generateBreadcrumbListSchema(items, 'en');

      expect(schema.itemListElement).toHaveLength(2);
      expect(schema.itemListElement[1]).toEqual({
        '@type': 'ListItem',
        position: 2,
        name: 'Learn',
        item: 'https://www.blindfold-chess.online/en/learn',
      });
    });

    it('should generate schema with multiple items', () => {
      const items: BreadcrumbItem[] = [
        { label: 'Learn', href: '/learn' },
        { label: 'Basics', href: '/learn/basics' },
        { label: 'Chess Notation' },
      ];
      const schema = generateBreadcrumbListSchema(items, 'en');

      expect(schema.itemListElement).toHaveLength(4);
      expect(schema.itemListElement[1].position).toBe(2);
      expect(schema.itemListElement[2].position).toBe(3);
      expect(schema.itemListElement[3].position).toBe(4);
    });

    it('should omit item URL for items without href', () => {
      const items: BreadcrumbItem[] = [{ label: 'Current Page' }];
      const schema = generateBreadcrumbListSchema(items, 'en');

      expect(schema.itemListElement[1]).toEqual({
        '@type': 'ListItem',
        position: 2,
        name: 'Current Page',
      });
      expect(schema.itemListElement[1]).not.toHaveProperty('item');
    });

    it('should use correct locale prefix for Japanese', () => {
      const items: BreadcrumbItem[] = [{ label: 'Learn', href: '/learn' }];
      const schema = generateBreadcrumbListSchema(items, 'ja');

      expect((schema.itemListElement[0] as { item: string }).item).toBe(
        'https://www.blindfold-chess.online/ja'
      );
      expect((schema.itemListElement[1] as { item: string }).item).toBe(
        'https://www.blindfold-chess.online/ja/learn'
      );
    });

    it('should handle items with nested paths', () => {
      const items: BreadcrumbItem[] = [
        { label: 'Learn', href: '/learn' },
        { label: 'Category', href: '/learn/category' },
        { label: 'Article', href: '/learn/category/article' },
      ];
      const schema = generateBreadcrumbListSchema(items, 'en');

      expect((schema.itemListElement[3] as { item: string }).item).toBe(
        'https://www.blindfold-chess.online/en/learn/category/article'
      );
    });
  });

  describe('generateFAQPageSchema', () => {
    it('should generate empty mainEntity for empty FAQ list', () => {
      const items: FAQItemData[] = [];
      const schema = generateFAQPageSchema(items);

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('FAQPage');
      expect(schema.mainEntity).toEqual([]);
    });

    it('should generate schema with single FAQ item', () => {
      const items: FAQItemData[] = [
        { question: 'What is blindfold chess?', answer: 'Chess played without seeing the board.' },
      ];
      const schema = generateFAQPageSchema(items);

      expect(schema.mainEntity).toHaveLength(1);
      expect(schema.mainEntity[0]).toEqual({
        '@type': 'Question',
        name: 'What is blindfold chess?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Chess played without seeing the board.',
        },
      });
    });

    it('should generate schema with multiple FAQ items', () => {
      const items: FAQItemData[] = [
        { question: 'Question 1?', answer: 'Answer 1.' },
        { question: 'Question 2?', answer: 'Answer 2.' },
        { question: 'Question 3?', answer: 'Answer 3.' },
      ];
      const schema = generateFAQPageSchema(items);

      expect(schema.mainEntity).toHaveLength(3);
      expect(schema.mainEntity[0].name).toBe('Question 1?');
      expect(schema.mainEntity[1].name).toBe('Question 2?');
      expect(schema.mainEntity[2].name).toBe('Question 3?');
    });

    it('should handle special characters in questions and answers', () => {
      const items: FAQItemData[] = [
        {
          question: 'Can I use symbols like & < > " in questions?',
          answer: 'Yes, they should be preserved: & < > "',
        },
      ];
      const schema = generateFAQPageSchema(items);

      expect(schema.mainEntity[0].name).toBe('Can I use symbols like & < > " in questions?');
      expect(schema.mainEntity[0].acceptedAnswer.text).toBe(
        'Yes, they should be preserved: & < > "'
      );
    });

    it('should handle multiline answers', () => {
      const items: FAQItemData[] = [
        {
          question: 'Can answers be multiline?',
          answer: 'Yes.\nThey can have multiple lines.\nLike this.',
        },
      ];
      const schema = generateFAQPageSchema(items);

      expect(schema.mainEntity[0].acceptedAnswer.text).toContain('\n');
    });
  });

  describe('generateArticleSchema', () => {
    const baseArticle: ArticleData = {
      title: 'Test Article',
      description: 'A test article description',
      slug: 'test-article',
      category: 'basics',
      publishedAt: '2024-01-15T10:00:00Z',
      locale: 'en',
    };

    it('should generate correct article schema with all fields', () => {
      const schema = generateArticleSchema(baseArticle);

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('Article');
      expect(schema.headline).toBe('Test Article');
      expect(schema.description).toBe('A test article description');
      expect(schema.datePublished).toBe('2024-01-15T10:00:00Z');
      expect(schema.inLanguage).toBe('en-US');
    });

    it('should generate correct mainEntityOfPage URL', () => {
      const schema = generateArticleSchema(baseArticle);

      expect(schema.mainEntityOfPage).toEqual({
        '@type': 'WebPage',
        '@id': 'https://www.blindfold-chess.online/en/learn/basics/test-article',
      });
    });

    it('should include author as Organization', () => {
      const schema = generateArticleSchema(baseArticle);

      expect(schema.author).toEqual({
        '@type': 'Organization',
        name: 'CheckmateWorks',
        url: 'https://www.blindfold-chess.online',
      });
    });

    it('should include publisher with logo', () => {
      const schema = generateArticleSchema(baseArticle);

      expect(schema.publisher).toEqual({
        '@type': 'Organization',
        name: 'CheckmateWorks',
        url: 'https://www.blindfold-chess.online',
        logo: {
          '@type': 'ImageObject',
          url: 'https://www.blindfold-chess.online/logo.png',
        },
      });
    });

    it('should use ja-JP for Japanese locale', () => {
      const article: ArticleData = { ...baseArticle, locale: 'ja' };
      const schema = generateArticleSchema(article);

      expect(schema.inLanguage).toBe('ja-JP');
    });

    it('should generate correct URL for Japanese locale', () => {
      const article: ArticleData = { ...baseArticle, locale: 'ja' };
      const schema = generateArticleSchema(article);

      expect(schema.mainEntityOfPage['@id']).toBe(
        'https://www.blindfold-chess.online/ja/learn/basics/test-article'
      );
    });

    it('should handle different categories', () => {
      const article: ArticleData = { ...baseArticle, category: 'advanced' };
      const schema = generateArticleSchema(article);

      expect(schema.mainEntityOfPage['@id']).toBe(
        'https://www.blindfold-chess.online/en/learn/advanced/test-article'
      );
    });
  });

  describe('generateBlogPostingSchema', () => {
    const basePost: BlogPostData = {
      title: 'Test Blog Post',
      description: 'A test blog post description',
      slug: 'test-blog-post',
      category: 'news',
      publishedAt: new Date('2024-01-20T14:30:00Z'),
      locale: 'en',
    };

    it('should generate correct blog posting schema with all fields', () => {
      const schema = generateBlogPostingSchema(basePost);

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('BlogPosting');
      expect(schema.headline).toBe('Test Blog Post');
      expect(schema.description).toBe('A test blog post description');
      expect(schema.datePublished).toBe('2024-01-20T14:30:00.000Z');
      expect(schema.inLanguage).toBe('en-US');
    });

    it('should generate correct mainEntityOfPage URL for posts', () => {
      const schema = generateBlogPostingSchema(basePost);

      expect(schema.mainEntityOfPage).toEqual({
        '@type': 'WebPage',
        '@id': 'https://www.blindfold-chess.online/en/posts/news/test-blog-post',
      });
    });

    it('should handle null publishedAt date', () => {
      const post: BlogPostData = { ...basePost, publishedAt: null };
      const schema = generateBlogPostingSchema(post);

      expect(schema.datePublished).toBeUndefined();
    });

    it('should include author as Organization', () => {
      const schema = generateBlogPostingSchema(basePost);

      expect(schema.author).toEqual({
        '@type': 'Organization',
        name: 'CheckmateWorks',
        url: 'https://www.blindfold-chess.online',
      });
    });

    it('should include publisher with logo', () => {
      const schema = generateBlogPostingSchema(basePost);

      expect(schema.publisher).toEqual({
        '@type': 'Organization',
        name: 'CheckmateWorks',
        url: 'https://www.blindfold-chess.online',
        logo: {
          '@type': 'ImageObject',
          url: 'https://www.blindfold-chess.online/logo.png',
        },
      });
    });

    it('should use ja-JP for Japanese locale', () => {
      const post: BlogPostData = { ...basePost, locale: 'ja' };
      const schema = generateBlogPostingSchema(post);

      expect(schema.inLanguage).toBe('ja-JP');
    });

    it('should generate correct URL for Japanese locale', () => {
      const post: BlogPostData = { ...basePost, locale: 'ja' };
      const schema = generateBlogPostingSchema(post);

      expect(schema.mainEntityOfPage['@id']).toBe(
        'https://www.blindfold-chess.online/ja/posts/news/test-blog-post'
      );
    });

    it('should handle different categories', () => {
      const post: BlogPostData = { ...basePost, category: 'updates' };
      const schema = generateBlogPostingSchema(post);

      expect(schema.mainEntityOfPage['@id']).toBe(
        'https://www.blindfold-chess.online/en/posts/updates/test-blog-post'
      );
    });

    it('should convert Date to ISO string format', () => {
      const specificDate = new Date('2024-06-15T08:45:30.500Z');
      const post: BlogPostData = { ...basePost, publishedAt: specificDate };
      const schema = generateBlogPostingSchema(post);

      expect(schema.datePublished).toBe('2024-06-15T08:45:30.500Z');
    });
  });
});
