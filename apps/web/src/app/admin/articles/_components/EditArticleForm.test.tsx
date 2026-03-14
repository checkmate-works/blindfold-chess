import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EditArticleForm } from './EditArticleForm';

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
  formTitle: 'Edit Article',
  slug: 'Slug',
  slugPlaceholder: 'e.g. new-feature-release',
  title: 'Title',
  titlePlaceholder: 'Article title',
  content: 'Content',
  contentPlaceholder: 'Article content...',
  locale: 'Locale',
  saveDraft: 'Save Draft',
  savingDraft: 'Saving...',
  preview: 'Preview',
  cancel: 'Cancel',
  backToList: 'Back to Articles',
};

const defaultValues = {
  slug: 'existing-slug',
  title: 'Existing Title',
  content: 'Existing Content',
  locale: 'en',
  status: 'published',
  pinnedAt: '2024-06-15T12:00',
  publishedAt: '2024-06-15T14:00',
};

describe('EditArticleForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call updateArticle with status draft and preserved publish settings on Save Draft', async () => {
    mockUpdateArticle.mockResolvedValue({ success: true, id: testId });

    render(<EditArticleForm id={testId} defaultValues={defaultValues} labels={defaultLabels} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
    });

    expect(mockUpdateArticle).toHaveBeenCalledWith(testId, {
      slug: 'existing-slug',
      title: 'Existing Title',
      content: 'Existing Content',
      locale: 'en',
      status: 'draft',
      pinnedAt: '2024-06-15T12:00',
      publishedAt: '2024-06-15T14:00',
    });
  });

  it('should call updateArticle with status draft on Preview and navigate to preview page', async () => {
    mockUpdateArticle.mockResolvedValue({ success: true, id: testId });

    render(<EditArticleForm id={testId} defaultValues={defaultValues} labels={defaultLabels} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    });

    expect(mockUpdateArticle).toHaveBeenCalledWith(testId, {
      slug: 'existing-slug',
      title: 'Existing Title',
      content: 'Existing Content',
      locale: 'en',
      status: 'draft',
      pinnedAt: '2024-06-15T12:00',
      publishedAt: '2024-06-15T14:00',
    });
    expect(mockPush).toHaveBeenCalledWith(`/admin/articles/${testId}/preview`);
  });

  it('should pass edited content fields to updateArticle with draft status', async () => {
    mockUpdateArticle.mockResolvedValue({ success: true, id: testId });

    render(<EditArticleForm id={testId} defaultValues={defaultValues} labels={defaultLabels} />);

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Updated Title' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
    });

    expect(mockUpdateArticle).toHaveBeenCalledWith(testId, {
      slug: 'existing-slug',
      title: 'Updated Title',
      content: 'Existing Content',
      locale: 'en',
      status: 'draft',
      pinnedAt: '2024-06-15T12:00',
      publishedAt: '2024-06-15T14:00',
    });
  });

  // --- articles-specific: NO visibility or notification in update data ---

  it('should NOT include visibility in update data (articles have no visibility)', async () => {
    mockUpdateArticle.mockResolvedValue({ success: true, id: testId });

    render(<EditArticleForm id={testId} defaultValues={defaultValues} labels={defaultLabels} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
    });

    const callArgs = mockUpdateArticle.mock.calls[0][1];
    expect('visibility' in callArgs).toBe(false);
  });

  it('should NOT include sendNotification in update data (articles have no notification)', async () => {
    mockUpdateArticle.mockResolvedValue({ success: true, id: testId });

    render(<EditArticleForm id={testId} defaultValues={defaultValues} labels={defaultLabels} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
    });

    const callArgs = mockUpdateArticle.mock.calls[0][1];
    expect('sendNotification' in callArgs).toBe(false);
  });
});
