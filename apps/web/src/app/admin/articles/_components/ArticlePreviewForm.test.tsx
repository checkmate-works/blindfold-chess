import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ArticlePreviewForm } from './ArticlePreviewForm';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

const mockUpdateArticle = vi.fn();

vi.mock('../_actions/updateArticle', () => ({
  updateArticle: (...args: unknown[]) => mockUpdateArticle(...args),
}));

const testId = 'art-00000000-0000-0000-0000-000000000001';

const defaultLabels = {
  status: 'Status',
  pinnedAt: 'Pinned At',
  publishedAt: 'Published At',
  save: 'Save',
  saving: 'Saving...',
  backToEdit: 'Back to Edit',
  draft: 'Draft',
  published: 'Published',
};

const defaultValues = {
  status: 'draft',
  pinnedAt: '',
  publishedAt: '',
};

const articleData = {
  slug: 'test-article',
  title: 'Test Article',
  content: '# Hello\nThis is a test.',
  locale: 'en',
};

describe('ArticlePreviewForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render Status as radio buttons', () => {
    render(
      <ArticlePreviewForm
        id={testId}
        articleData={articleData}
        defaultValues={defaultValues}
        labels={defaultLabels}
      />
    );

    expect(screen.getByRole('radio', { name: 'Draft' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Published' })).toBeInTheDocument();
  });

  it('should NOT render Visibility radio buttons (articles have no visibility)', () => {
    render(
      <ArticlePreviewForm
        id={testId}
        articleData={articleData}
        defaultValues={defaultValues}
        labels={defaultLabels}
      />
    );

    expect(screen.queryByText('Public')).not.toBeInTheDocument();
    expect(screen.queryByText('Members')).not.toBeInTheDocument();
  });

  it('should render Pinned At field', () => {
    render(
      <ArticlePreviewForm
        id={testId}
        articleData={articleData}
        defaultValues={defaultValues}
        labels={defaultLabels}
      />
    );

    expect(screen.getByLabelText('Pinned At')).toBeInTheDocument();
  });

  it('should not show Published At when status is draft', () => {
    render(
      <ArticlePreviewForm
        id={testId}
        articleData={articleData}
        defaultValues={defaultValues}
        labels={defaultLabels}
      />
    );

    expect(screen.queryByLabelText('Published At')).not.toBeInTheDocument();
  });

  it('should show Published At when status is published', () => {
    render(
      <ArticlePreviewForm
        id={testId}
        articleData={articleData}
        defaultValues={{ ...defaultValues, status: 'published', publishedAt: '2024-06-15T14:00' }}
        labels={defaultLabels}
      />
    );

    expect(screen.getByLabelText('Published At')).toBeInTheDocument();
    expect(screen.getByLabelText('Published At')).toHaveValue('2024-06-15T14:00');
  });

  it('should show Published At when switching status from draft to published', () => {
    render(
      <ArticlePreviewForm
        id={testId}
        articleData={articleData}
        defaultValues={defaultValues}
        labels={defaultLabels}
      />
    );

    expect(screen.queryByLabelText('Published At')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: 'Published' }));

    expect(screen.getByLabelText('Published At')).toBeInTheDocument();
  });

  it('should render Save and Back to Edit buttons', () => {
    render(
      <ArticlePreviewForm
        id={testId}
        articleData={articleData}
        defaultValues={defaultValues}
        labels={defaultLabels}
      />
    );

    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to Edit' })).toBeInTheDocument();
  });

  it('should populate form with default values', () => {
    const values = {
      status: 'published',
      pinnedAt: '2024-06-15T12:00',
      publishedAt: '2024-06-15T14:00',
    };

    render(
      <ArticlePreviewForm
        id={testId}
        articleData={articleData}
        defaultValues={values}
        labels={defaultLabels}
      />
    );

    expect(screen.getByRole('radio', { name: 'Published' })).toBeChecked();
    expect(screen.getByLabelText('Pinned At')).toHaveValue('2024-06-15T12:00');
    expect(screen.getByLabelText('Published At')).toHaveValue('2024-06-15T14:00');
  });

  it('should call updateArticle with form data and navigate to list on Save', async () => {
    mockUpdateArticle.mockResolvedValue({ success: true, id: testId });

    render(
      <ArticlePreviewForm
        id={testId}
        articleData={articleData}
        defaultValues={defaultValues}
        labels={defaultLabels}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });

    expect(mockUpdateArticle).toHaveBeenCalledWith(testId, {
      ...articleData,
      status: 'draft',
      pinnedAt: null,
      publishedAt: null,
    });
    expect(mockPush).toHaveBeenCalledWith('/admin/articles');
  });

  it('should submit changed status values', async () => {
    mockUpdateArticle.mockResolvedValue({ success: true, id: testId });

    render(
      <ArticlePreviewForm
        id={testId}
        articleData={articleData}
        defaultValues={defaultValues}
        labels={defaultLabels}
      />
    );

    fireEvent.click(screen.getByRole('radio', { name: 'Published' }));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });

    expect(mockUpdateArticle).toHaveBeenCalledWith(testId, {
      ...articleData,
      status: 'published',
      pinnedAt: null,
      publishedAt: null,
    });
  });

  it('should display error message when updateArticle returns an error', async () => {
    mockUpdateArticle.mockResolvedValue({
      error: 'Published date is required when status is published',
    });

    render(
      <ArticlePreviewForm
        id={testId}
        articleData={articleData}
        defaultValues={defaultValues}
        labels={defaultLabels}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });

    expect(
      screen.getByText('Published date is required when status is published')
    ).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should navigate to edit page on Back to Edit', () => {
    render(
      <ArticlePreviewForm
        id={testId}
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
      <ArticlePreviewForm
        id={testId}
        articleData={articleData}
        defaultValues={{ ...defaultValues, pinnedAt: '', publishedAt: '' }}
        labels={defaultLabels}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
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
      <ArticlePreviewForm
        id={testId}
        articleData={articleData}
        defaultValues={defaultValues}
        labels={defaultLabels}
      />
    );

    fireEvent.click(screen.getByRole('radio', { name: 'Published' }));

    expect(screen.queryByText('Send notification to users')).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('should NOT include sendNotification in update data', async () => {
    mockUpdateArticle.mockResolvedValue({ success: true, id: testId });

    render(
      <ArticlePreviewForm
        id={testId}
        articleData={articleData}
        defaultValues={defaultValues}
        labels={defaultLabels}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });

    const callArgs = mockUpdateArticle.mock.calls[0][1];
    expect('sendNotification' in callArgs).toBe(false);
  });

  // --- articles-specific: NO visibility in submit data ---

  it('should NOT include visibility in update data', async () => {
    mockUpdateArticle.mockResolvedValue({ success: true, id: testId });

    render(
      <ArticlePreviewForm
        id={testId}
        articleData={articleData}
        defaultValues={defaultValues}
        labels={defaultLabels}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });

    const callArgs = mockUpdateArticle.mock.calls[0][1];
    expect('visibility' in callArgs).toBe(false);
  });
});
