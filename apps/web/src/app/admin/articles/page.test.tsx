import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AdminArticlesPage from './page';

const mockDbExecute = vi.fn();
const mockDbSelectFrom = vi.fn();
const mockGetTranslations = vi.fn();

vi.mock('next-intl/server', () => ({
  getTranslations: (...args: unknown[]) => mockGetTranslations(...args),
}));

vi.mock('nuqs/server', () => ({
  createSearchParamsCache: () => ({
    parse: async (sp: unknown) => {
      const resolved = await (sp as Promise<Record<string, string | string[] | undefined>>);
      const pageStr = typeof resolved?.page === 'string' ? resolved.page : '1';
      return { page: parseInt(pageStr, 10) || 1 };
    },
  }),
  parseAsInteger: {
    withDefault: (val: number) => val,
  },
}));

vi.mock('@/lib/db', () => ({
  db: {
    execute: (...args: unknown[]) => mockDbExecute(...args),
    select: () => ({
      from: (...args: unknown[]) => mockDbSelectFrom(...args),
    }),
  },
  articles: {
    slug: 'slug',
    title: 'title',
    locale: 'locale',
    status: 'status',
    createdAt: 'created_at',
  },
}));

vi.mock('drizzle-orm', () => ({
  sql: (strings: TemplateStringsArray) => strings.join(''),
}));

vi.mock('@/app/[locale]/_components', () => ({
  PaginationNav: ({
    currentPage,
    totalPages,
  }: {
    currentPage: number;
    totalPages: number;
    buildHref: (page: number) => string;
  }) => (
    <div data-testid="pagination-nav">
      Page {currentPage} of {totalPages}
    </div>
  ),
}));

// Translations mock
function createTranslationFn() {
  const translations: Record<string, string> = {
    title: 'Articles',
    newArticle: 'New Article',
    titleColumn: 'Title',
    slug: 'Slug',
    actions: 'Actions',
    noArticlesFound: 'No articles found',
    variants: 'Variants',
  };
  return (key: string) => translations[key] ?? key;
}

describe('AdminArticlesPage (slug-grouped list)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTranslations.mockResolvedValue(createTranslationFn());
  });

  function createSearchParams(
    params: Record<string, string> = {}
  ): Promise<Record<string, string | string[] | undefined>> {
    return Promise.resolve(params);
  }

  describe('data fetching and display', () => {
    it('displays articles grouped by slug', async () => {
      mockDbExecute.mockResolvedValue([
        {
          slug: 'getting-started',
          representative_title: 'Getting Started',
        },
        {
          slug: 'advanced-tips',
          representative_title: 'Advanced Tips',
        },
      ]);
      mockDbSelectFrom.mockResolvedValue([{ count: 2 }]);

      const jsx = await AdminArticlesPage({ searchParams: createSearchParams() });
      render(jsx);

      expect(screen.getByText('Getting Started')).toBeInTheDocument();
      expect(screen.getByText('getting-started')).toBeInTheDocument();

      expect(screen.getByText('Advanced Tips')).toBeInTheDocument();
      expect(screen.getByText('advanced-tips')).toBeInTheDocument();
    });

    it('displays page title and new article link', async () => {
      mockDbExecute.mockResolvedValue([]);
      mockDbSelectFrom.mockResolvedValue([{ count: 0 }]);

      const jsx = await AdminArticlesPage({ searchParams: createSearchParams() });
      render(jsx);

      expect(screen.getByText('Articles')).toBeInTheDocument();
      expect(screen.getByText('New Article')).toBeInTheDocument();
    });

    it('displays link to slug detail page for each row', async () => {
      mockDbExecute.mockResolvedValue([
        {
          slug: 'my-article',
          representative_title: 'My Article',
        },
      ]);
      mockDbSelectFrom.mockResolvedValue([{ count: 1 }]);

      const jsx = await AdminArticlesPage({ searchParams: createSearchParams() });
      render(jsx);

      const viewLink = screen.getByText('Variants');
      expect(viewLink.closest('a')).toHaveAttribute('href', '/admin/articles/slug/my-article');
    });
  });

  describe('no articles', () => {
    it('displays empty message when no articles exist', async () => {
      mockDbExecute.mockResolvedValue([]);
      mockDbSelectFrom.mockResolvedValue([{ count: 0 }]);

      const jsx = await AdminArticlesPage({ searchParams: createSearchParams() });
      render(jsx);

      expect(screen.getByText('No articles found')).toBeInTheDocument();
    });
  });

  describe('pagination', () => {
    it('passes currentPage and totalPages to PaginationNav', async () => {
      mockDbExecute.mockResolvedValue([]);
      mockDbSelectFrom.mockResolvedValue([{ count: 50 }]);

      const jsx = await AdminArticlesPage({
        searchParams: createSearchParams({ page: '2' }),
      });
      render(jsx);

      const pagination = screen.getByTestId('pagination-nav');
      expect(pagination).toHaveTextContent('Page 2 of 3');
    });

    it('displays pagination for page=1', async () => {
      mockDbExecute.mockResolvedValue([]);
      mockDbSelectFrom.mockResolvedValue([{ count: 25 }]);

      const jsx = await AdminArticlesPage({ searchParams: createSearchParams() });
      render(jsx);

      const pagination = screen.getByTestId('pagination-nav');
      expect(pagination).toHaveTextContent('Page 1 of 2');
    });

    it('sets totalPages to 1 when totalCount is 0', async () => {
      mockDbExecute.mockResolvedValue([]);
      mockDbSelectFrom.mockResolvedValue([{ count: 0 }]);

      const jsx = await AdminArticlesPage({ searchParams: createSearchParams() });
      render(jsx);

      const pagination = screen.getByTestId('pagination-nav');
      expect(pagination).toHaveTextContent('Page 1 of 1');
    });
  });
});
