import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AdminArticleSlugPage from './page';

const mockDbSelectFromWhereOrderBy = vi.fn();
const mockGetTranslations = vi.fn();

vi.mock('next-intl/server', () => ({
  getTranslations: (...args: unknown[]) => mockGetTranslations(...args),
}));

const mockNotFound = vi.fn();
vi.mock('next/navigation', () => ({
  notFound: () => {
    mockNotFound();
    throw new Error('NEXT_NOT_FOUND');
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: (col: unknown, val: unknown) => ({ col, val }),
}));

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: (...args: unknown[]) => mockDbSelectFromWhereOrderBy(...args),
        }),
      }),
    }),
  },
  articles: {
    slug: 'slug',
    locale: 'locale',
  },
}));

vi.mock('@/config', () => ({
  SUPPORTED_LOCALES: ['en', 'ja'],
}));

vi.mock('../../../_components/AdminDataTable', () => ({
  AdminDataTable: <T,>({
    headers,
    items,
    renderRow,
    emptyMessage,
  }: {
    headers: React.ReactNode[];
    items: T[];
    renderRow: (item: T, index: number) => React.ReactNode;
    emptyMessage: React.ReactNode;
  }) => (
    <div data-testid="admin-data-table">
      <table>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => renderRow(item, index))}
          {items.length === 0 && (
            <tr>
              <td>{emptyMessage}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  ),
}));

vi.mock('react-icons/fa', () => ({
  FaExternalLinkAlt: ({ className }: { className?: string }) => (
    <span data-testid="external-link-icon" className={className} />
  ),
}));

vi.mock('../../_components/DeleteArticleButton', () => ({
  DeleteArticleButton: ({
    title,
  }: {
    id: string;
    title: string;
    labels: Record<string, string>;
  }) => <button data-testid={`delete-btn-${title}`}>Delete {title}</button>,
}));

function createTranslationFn() {
  const translations: Record<string, string> = {
    'form.backToList': 'Back to list',
    'slugDetail.title': 'Article Languages',
    slug: 'Slug',
    locale: 'Locale',
    titleColumn: 'Title',
    status: 'Status',
    publishedAt: 'Published At',
    actions: 'Actions',
    'slugDetail.noArticlesFound': 'No articles found for this slug',
    'slugDetail.missingLocales': 'Missing Variants',
    published: 'Published',
    draft: 'Draft',
    edit: 'Edit',
    delete: 'Delete',
    deleteModalTitle: 'Delete',
    deleteModalMessage: 'Are you sure?',
    deleteModalCancel: 'Cancel',
    deleteModalConfirm: 'Confirm',
    deleteModalDeleting: 'Deleting...',
    'slugDetail.viewPublished': 'View',
  };
  return (key: string, params?: Record<string, string>) => {
    if (key === 'slugDetail.createForLocale' && params?.locale) {
      return `Create ${params.locale} variant`;
    }
    return translations[key] ?? key;
  };
}

function createArticle(overrides: Record<string, unknown> = {}) {
  return {
    id: 'art-001',
    slug: 'test-article',
    title: 'Test Article',
    excerpt: null,
    description: null,
    content: 'content',
    contentJson: null,
    contentFormat: 'markdown',
    locale: 'en',
    status: 'published',
    categoryId: null,
    displayOrder: 0,
    icon: null,
    pinnedAt: null,
    publishedAt: new Date('2024-01-15T10:00:00Z'),
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('AdminArticleSlugPage (locale variant detail page)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTranslations.mockResolvedValue(createTranslationFn());
  });

  function createParams(slug: string): Promise<{ slug: string }> {
    return Promise.resolve({ slug });
  }

  describe('when articles exist', () => {
    it('displays articles for each locale within the slug', async () => {
      const enArticle = createArticle({ id: 'art-en', locale: 'en', title: 'English Title' });
      const jaArticle = createArticle({
        id: 'art-ja',
        locale: 'ja',
        title: 'Japanese Title',
        status: 'draft',
      });
      mockDbSelectFromWhereOrderBy.mockResolvedValue([enArticle, jaArticle]);

      const jsx = await AdminArticleSlugPage({ params: createParams('test-article') });
      render(jsx);

      expect(screen.getByText('English Title')).toBeInTheDocument();
      expect(screen.getByText('Japanese Title')).toBeInTheDocument();
      expect(screen.getByText('en')).toBeInTheDocument();
      expect(screen.getByText('ja')).toBeInTheDocument();
    });

    it('displays page title and slug', async () => {
      mockDbSelectFromWhereOrderBy.mockResolvedValue([createArticle()]);

      const jsx = await AdminArticleSlugPage({ params: createParams('test-article') });
      render(jsx);

      expect(screen.getByText('Article Languages')).toBeInTheDocument();
      expect(screen.getByText('test-article')).toBeInTheDocument();
    });

    it('displays back to list link', async () => {
      mockDbSelectFromWhereOrderBy.mockResolvedValue([createArticle()]);

      const jsx = await AdminArticleSlugPage({ params: createParams('test-article') });
      render(jsx);

      const backLink = screen.getByText('Back to list');
      expect(backLink.closest('a')).toHaveAttribute('href', '/admin/articles');
    });

    it('displays edit link for each article', async () => {
      const article = createArticle({ id: 'art-123' });
      mockDbSelectFromWhereOrderBy.mockResolvedValue([article]);

      const jsx = await AdminArticleSlugPage({ params: createParams('test-article') });
      render(jsx);

      const editLink = screen.getByText('Edit');
      expect(editLink.closest('a')).toHaveAttribute('href', '/admin/articles/art-123/edit');
    });

    it('displays delete button for each article', async () => {
      const article = createArticle({ id: 'art-123', title: 'My Article' });
      mockDbSelectFromWhereOrderBy.mockResolvedValue([article]);

      const jsx = await AdminArticleSlugPage({ params: createParams('test-article') });
      render(jsx);

      expect(screen.getByTestId('delete-btn-My Article')).toBeInTheDocument();
    });

    it('displays date when publishedAt is present', async () => {
      const article = createArticle({
        publishedAt: new Date('2024-06-15T12:00:00Z'),
      });
      mockDbSelectFromWhereOrderBy.mockResolvedValue([article]);

      const jsx = await AdminArticleSlugPage({ params: createParams('test-article') });
      render(jsx);

      // publishedAt is displayed via toLocaleString() - verify it contains the date
      const cells = screen.getAllByRole('cell');
      const publishedAtCell = cells.find(
        (cell) => cell.textContent !== '-' && cell.textContent?.includes('2024')
      );
      expect(publishedAtCell).toBeDefined();
    });

    it('displays hyphen when publishedAt is null', async () => {
      const article = createArticle({ publishedAt: null });
      mockDbSelectFromWhereOrderBy.mockResolvedValue([article]);

      const jsx = await AdminArticleSlugPage({ params: createParams('test-article') });
      render(jsx);

      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('displays Published badge when status is published', async () => {
      const article = createArticle({ status: 'published' });
      mockDbSelectFromWhereOrderBy.mockResolvedValue([article]);

      const jsx = await AdminArticleSlugPage({ params: createParams('test-article') });
      render(jsx);

      expect(screen.getByText('Published')).toBeInTheDocument();
    });

    it('displays Draft badge when status is draft', async () => {
      const article = createArticle({ status: 'draft' });
      mockDbSelectFromWhereOrderBy.mockResolvedValue([article]);

      const jsx = await AdminArticleSlugPage({ params: createParams('test-article') });
      render(jsx);

      expect(screen.getByText('Draft')).toBeInTheDocument();
    });
  });

  describe('external links to published articles', () => {
    it('displays View link for published articles', async () => {
      const article = createArticle({
        status: 'published',
        publishedAt: new Date('2024-06-15T12:00:00Z'),
        locale: 'en',
        slug: 'test-article',
      });
      mockDbSelectFromWhereOrderBy.mockResolvedValue([article]);

      const jsx = await AdminArticleSlugPage({ params: createParams('test-article') });
      render(jsx);

      const viewLink = screen.getByText('View');
      const anchor = viewLink.closest('a');
      expect(anchor).toHaveAttribute('href', '/en/articles/test-article');
      expect(anchor).toHaveAttribute('target', '_blank');
      expect(anchor).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('displays external link icon', async () => {
      const article = createArticle({
        status: 'published',
        publishedAt: new Date('2024-06-15T12:00:00Z'),
      });
      mockDbSelectFromWhereOrderBy.mockResolvedValue([article]);

      const jsx = await AdminArticleSlugPage({ params: createParams('test-article') });
      render(jsx);

      expect(screen.getByTestId('external-link-icon')).toBeInTheDocument();
    });

    it('does not display View link for draft articles', async () => {
      const article = createArticle({ status: 'draft', publishedAt: null });
      mockDbSelectFromWhereOrderBy.mockResolvedValue([article]);

      const jsx = await AdminArticleSlugPage({ params: createParams('test-article') });
      render(jsx);

      expect(screen.queryByText('View')).not.toBeInTheDocument();
    });

    it('does not display View link when status is published but publishedAt is null', async () => {
      const article = createArticle({ status: 'published', publishedAt: null });
      mockDbSelectFromWhereOrderBy.mockResolvedValue([article]);

      const jsx = await AdminArticleSlugPage({ params: createParams('test-article') });
      render(jsx);

      expect(screen.queryByText('View')).not.toBeInTheDocument();
    });
  });

  describe('missing locale display', () => {
    it('displays create link for ja when only en exists', async () => {
      const article = createArticle({ locale: 'en' });
      mockDbSelectFromWhereOrderBy.mockResolvedValue([article]);

      const jsx = await AdminArticleSlugPage({ params: createParams('test-article') });
      render(jsx);

      expect(screen.getByText('Missing Variants')).toBeInTheDocument();
      const createLink = screen.getByText('Create ja variant');
      expect(createLink.closest('a')).toHaveAttribute(
        'href',
        '/admin/articles/new?slug=test-article&locale=ja&contentFormat=markdown'
      );
    });

    it('displays create link for en when only ja exists', async () => {
      const article = createArticle({ locale: 'ja' });
      mockDbSelectFromWhereOrderBy.mockResolvedValue([article]);

      const jsx = await AdminArticleSlugPage({ params: createParams('test-article') });
      render(jsx);

      const createLink = screen.getByText('Create en variant');
      expect(createLink.closest('a')).toHaveAttribute(
        'href',
        '/admin/articles/new?slug=test-article&locale=en&contentFormat=markdown'
      );
    });

    it('does not display Missing Variants section when all locales exist', async () => {
      const enArticle = createArticle({ id: 'art-en', locale: 'en' });
      const jaArticle = createArticle({ id: 'art-ja', locale: 'ja' });
      mockDbSelectFromWhereOrderBy.mockResolvedValue([enArticle, jaArticle]);

      const jsx = await AdminArticleSlugPage({ params: createParams('test-article') });
      render(jsx);

      expect(screen.queryByText('Missing Variants')).not.toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('calls notFound() for non-existent slug', async () => {
      mockDbSelectFromWhereOrderBy.mockResolvedValue([]);

      await expect(
        AdminArticleSlugPage({ params: createParams('non-existent-slug') })
      ).rejects.toThrow('NEXT_NOT_FOUND');

      expect(mockNotFound).toHaveBeenCalled();
    });

    it('generates correct links when slug contains characters requiring encoding', async () => {
      const article = createArticle({ locale: 'en', slug: 'article with spaces' });
      mockDbSelectFromWhereOrderBy.mockResolvedValue([article]);

      const jsx = await AdminArticleSlugPage({
        params: createParams('article with spaces'),
      });
      render(jsx);

      const createJaLink = screen.getByText('Create ja variant');
      expect(createJaLink.closest('a')).toHaveAttribute(
        'href',
        '/admin/articles/new?slug=article%20with%20spaces&locale=ja&contentFormat=markdown'
      );
    });
  });
});
