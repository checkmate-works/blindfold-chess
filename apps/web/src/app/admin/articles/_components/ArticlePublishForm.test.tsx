import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ArticlePublishForm } from './ArticlePublishForm';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

const mockShowToast = vi.fn();

vi.mock('@/app/[locale]/_contexts/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

const mockUpdateArticle = vi.fn();

vi.mock('../_actions/updateArticle', () => ({
  updateArticle: (...args: unknown[]) => mockUpdateArticle(...args),
}));

const testId = 'art-00000000-0000-0000-0000-000000000001';

const defaultLabels = {
  pinnedAt: 'Pinned At',
  publishedAt: 'Published At',
  publish: 'Publish',
  publishing: 'Publishing...',
  published: 'Article published',
  backToEdit: 'Back to Edit',
};

const defaultValues = {
  pinnedAt: '',
  publishedAt: '',
};

const articleData = {
  slug: 'test-article',
  title: 'Test Article',
  content: '# Hello\nThis is a test.',
  contentJson: null,
  contentFormat: 'markdown' as const,
  locale: 'en',
  excerpt: null,
  description: null,
  categoryId: null,
  icon: null,
};

describe('ArticlePublishForm', () => {
  it('should NOT render status radio buttons (always publishes)', () => {
    render(
      <ArticlePublishForm
        id={testId}
        slug="test-article"
        articleData={articleData}
        defaultValues={defaultValues}
        labels={defaultLabels}
      />
    );

    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });

  it('should always render Published At field', () => {
    render(
      <ArticlePublishForm
        id={testId}
        slug="test-article"
        articleData={articleData}
        defaultValues={defaultValues}
        labels={defaultLabels}
      />
    );

    expect(screen.getByLabelText('Published At')).toBeInTheDocument();
  });

  it('should render Pinned At field', () => {
    render(
      <ArticlePublishForm
        id={testId}
        slug="test-article"
        articleData={articleData}
        defaultValues={defaultValues}
        labels={defaultLabels}
      />
    );

    expect(screen.getByLabelText('Pinned At')).toBeInTheDocument();
  });

  it('should render Publish and Back to Edit buttons', () => {
    render(
      <ArticlePublishForm
        id={testId}
        slug="test-article"
        articleData={articleData}
        defaultValues={defaultValues}
        labels={defaultLabels}
      />
    );

    expect(screen.getByRole('button', { name: 'Publish' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to Edit' })).toBeInTheDocument();
  });

  it('should populate form with default values', () => {
    const values = {
      pinnedAt: '2024-06-15T12:00',
      publishedAt: '2024-06-15T14:00',
    };

    render(
      <ArticlePublishForm
        id={testId}
        slug="test-article"
        articleData={articleData}
        defaultValues={values}
        labels={defaultLabels}
      />
    );

    expect(screen.getByLabelText('Pinned At')).toHaveValue('2024-06-15T12:00');
    expect(screen.getByLabelText('Published At')).toHaveValue('2024-06-15T14:00');
  });

  it('should call updateArticle with status published and navigate to list on Publish', async () => {
    mockUpdateArticle.mockResolvedValue({ success: true, id: testId });

    render(
      <ArticlePublishForm
        id={testId}
        slug="test-article"
        articleData={articleData}
        defaultValues={defaultValues}
        labels={defaultLabels}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    });

    expect(mockUpdateArticle).toHaveBeenCalledWith(testId, {
      ...articleData,
      status: 'published',
      pinnedAt: null,
      publishedAt: null,
    });
    expect(mockPush).toHaveBeenCalledWith('/admin/articles/slug/test-article');
  });

  it('should always set status to published regardless of original status', async () => {
    mockUpdateArticle.mockResolvedValue({ success: true, id: testId });

    render(
      <ArticlePublishForm
        id={testId}
        slug="test-article"
        articleData={articleData}
        defaultValues={defaultValues}
        labels={defaultLabels}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    });

    const callArgs = mockUpdateArticle.mock.calls[0][1];
    expect(callArgs.status).toBe('published');
  });

  it('should submit with entered publishedAt and pinnedAt values', async () => {
    mockUpdateArticle.mockResolvedValue({ success: true, id: testId });

    render(
      <ArticlePublishForm
        id={testId}
        slug="test-article"
        articleData={articleData}
        defaultValues={{ pinnedAt: '2024-01-01T12:00', publishedAt: '2024-06-15T14:00' }}
        labels={defaultLabels}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    });

    expect(mockUpdateArticle).toHaveBeenCalledWith(testId, {
      ...articleData,
      status: 'published',
      pinnedAt: '2024-01-01T12:00',
      publishedAt: '2024-06-15T14:00',
    });
  });

  it('should display error message when updateArticle returns an error', async () => {
    mockUpdateArticle.mockResolvedValue({
      error: 'Something went wrong',
    });

    render(
      <ArticlePublishForm
        id={testId}
        slug="test-article"
        articleData={articleData}
        defaultValues={defaultValues}
        labels={defaultLabels}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    });

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should navigate to edit page on Back to Edit', () => {
    render(
      <ArticlePublishForm
        id={testId}
        slug="test-article"
        articleData={articleData}
        defaultValues={defaultValues}
        labels={defaultLabels}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Back to Edit' }));

    expect(mockPush).toHaveBeenCalledWith(`/admin/articles/${testId}/edit`);
    expect(mockUpdateArticle).not.toHaveBeenCalled();
  });

  it('should convert empty pinnedAt and publishedAt to null on submit', async () => {
    mockUpdateArticle.mockResolvedValue({ success: true, id: testId });

    render(
      <ArticlePublishForm
        id={testId}
        slug="test-article"
        articleData={articleData}
        defaultValues={{ pinnedAt: '', publishedAt: '' }}
        labels={defaultLabels}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    });

    expect(mockUpdateArticle).toHaveBeenCalledWith(
      testId,
      expect.objectContaining({
        pinnedAt: null,
        publishedAt: null,
      })
    );
  });

  // --- articles-specific: NO notification checkbox ---

  it('should NOT show notification checkbox (articles have no notification feature)', () => {
    render(
      <ArticlePublishForm
        id={testId}
        slug="test-article"
        articleData={articleData}
        defaultValues={defaultValues}
        labels={defaultLabels}
      />
    );

    expect(screen.queryByText('Send notification to users')).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('should NOT include sendNotification in update data', async () => {
    mockUpdateArticle.mockResolvedValue({ success: true, id: testId });

    render(
      <ArticlePublishForm
        id={testId}
        slug="test-article"
        articleData={articleData}
        defaultValues={defaultValues}
        labels={defaultLabels}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    });

    const callArgs = mockUpdateArticle.mock.calls[0][1];
    expect('sendNotification' in callArgs).toBe(false);
  });

  // --- articles-specific: NO visibility in submit data ---

  it('should NOT include visibility in update data', async () => {
    mockUpdateArticle.mockResolvedValue({ success: true, id: testId });

    render(
      <ArticlePublishForm
        id={testId}
        slug="test-article"
        articleData={articleData}
        defaultValues={defaultValues}
        labels={defaultLabels}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    });

    const callArgs = mockUpdateArticle.mock.calls[0][1];
    expect('visibility' in callArgs).toBe(false);
  });

  // --- New fields in articleData are passed through to updateArticle ---

  it('should pass articleData with new fields to updateArticle on Publish', async () => {
    mockUpdateArticle.mockResolvedValue({ success: true, id: testId });

    const articleDataWithFields = {
      slug: 'test-article',
      title: 'Test Article',
      content: '# Hello\nThis is a test.',
      contentJson: null,
      contentFormat: 'markdown' as const,
      locale: 'en',
      excerpt: 'A brief summary',
      description: 'Meta description for SEO',
      categoryId: 'cat-123',
      icon: '♟️',
    };

    render(
      <ArticlePublishForm
        id={testId}
        slug="test-article"
        articleData={articleDataWithFields}
        defaultValues={defaultValues}
        labels={defaultLabels}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    });

    expect(mockUpdateArticle).toHaveBeenCalledWith(
      testId,
      expect.objectContaining({
        excerpt: 'A brief summary',
        description: 'Meta description for SEO',
        categoryId: 'cat-123',
        icon: '♟️',
      })
    );
  });

  it('should pass articleData with null new fields to updateArticle on Publish', async () => {
    mockUpdateArticle.mockResolvedValue({ success: true, id: testId });

    render(
      <ArticlePublishForm
        id={testId}
        slug="test-article"
        articleData={articleData}
        defaultValues={defaultValues}
        labels={defaultLabels}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    });

    expect(mockUpdateArticle).toHaveBeenCalledWith(
      testId,
      expect.objectContaining({
        excerpt: null,
        description: null,
        categoryId: null,
        icon: null,
      })
    );
  });

  it('should merge articleData and form values correctly on Publish', async () => {
    mockUpdateArticle.mockResolvedValue({ success: true, id: testId });

    const articleDataWithFields = {
      slug: 'test-article',
      title: 'Test Article',
      content: '# Hello\nThis is a test.',
      contentJson: null,
      contentFormat: 'markdown' as const,
      locale: 'en',
      excerpt: 'Summary',
      description: 'Description',
      categoryId: 'cat-1',
      icon: '♟️',
    };

    render(
      <ArticlePublishForm
        id={testId}
        slug="test-article"
        articleData={articleDataWithFields}
        defaultValues={{ pinnedAt: '2024-01-01T12:00', publishedAt: '2024-06-15T14:00' }}
        labels={defaultLabels}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    });

    expect(mockUpdateArticle).toHaveBeenCalledWith(testId, {
      ...articleDataWithFields,
      status: 'published',
      pinnedAt: '2024-01-01T12:00',
      publishedAt: '2024-06-15T14:00',
    });
  });
});
