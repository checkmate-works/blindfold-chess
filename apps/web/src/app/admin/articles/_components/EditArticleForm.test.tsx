import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EditArticleForm } from './EditArticleForm';

const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
}));

vi.mock('next-navigation-guard', () => ({
  useNavigationGuard: () => ({
    active: false,
    accept: vi.fn(),
    reject: vi.fn(),
  }),
}));

vi.mock('next/dynamic', () => ({
  default: (loader: () => Promise<{ default: React.ComponentType }>) => {
    let Resolved: React.ComponentType | null = null;
    const promise = loader();
    promise.then((mod) => {
      Resolved = mod.default;
    });
    return function DynamicWrapper(props: Record<string, unknown>) {
      if (!Resolved) return null;
      return <Resolved {...props} />;
    };
  },
}));

vi.mock('@/app/[locale]/_components/MarkdownRenderer', () => ({
  MarkdownRenderer: ({ content }: { content: string }) => (
    <div data-testid="markdown-preview">{content}</div>
  ),
}));

vi.mock('@/app/[locale]/_contexts/ToastContext', () => ({
  useToast: () => ({
    toasts: [],
    showToast: vi.fn(),
    hideToast: vi.fn(),
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
  draftSaved: 'Draft saved',
  preview: 'Publish Settings',
  cancel: 'Cancel',
  excerpt: 'Excerpt',
  excerptPlaceholder: 'Brief summary of the article...',
  description: 'Description (SEO)',
  descriptionPlaceholder: 'Meta description for search engines...',
  category: 'Category',
  categoryNone: 'None',
  icon: 'Icon',
  iconPlaceholder: 'e.g. ♟️',
  metadata: 'Metadata',
  tabEdit: 'Edit',
  tabPreview: 'Preview',
  unsavedChangesTitle: 'Unsaved Changes',
  unsavedChangesMessage: 'You have unsaved changes. Are you sure you want to leave?',
  unsavedChangesConfirm: 'Leave',
  unsavedChangesCancel: 'Stay',
};

const defaultValues = {
  slug: 'existing-slug',
  title: 'Existing Title',
  content: 'Existing Content',
  locale: 'en',
  status: 'published',
  pinnedAt: '2024-06-15T12:00',
  publishedAt: '2024-06-15T14:00',
  excerpt: '',
  description: '',
  categoryId: '',
  icon: '',
};

function openMetadataPanel() {
  fireEvent.click(screen.getByTitle('Metadata'));
}

describe('EditArticleForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call updateArticle with status draft and preserved publish settings on Save Draft', async () => {
    mockUpdateArticle.mockResolvedValue({ success: true, id: testId });

    render(
      <EditArticleForm
        id={testId}
        defaultValues={defaultValues}
        categories={[]}
        labels={defaultLabels}
      />
    );

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
      excerpt: null,
      description: null,
      categoryId: null,
      icon: null,
    });
  });

  it('should call updateArticle with status draft on Preview and navigate to preview page', async () => {
    mockUpdateArticle.mockResolvedValue({ success: true, id: testId });

    render(
      <EditArticleForm
        id={testId}
        defaultValues={defaultValues}
        categories={[]}
        labels={defaultLabels}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Publish Settings' }));
    });

    expect(mockUpdateArticle).toHaveBeenCalledWith(testId, {
      slug: 'existing-slug',
      title: 'Existing Title',
      content: 'Existing Content',
      locale: 'en',
      status: 'draft',
      pinnedAt: '2024-06-15T12:00',
      publishedAt: '2024-06-15T14:00',
      excerpt: null,
      description: null,
      categoryId: null,
      icon: null,
    });
    expect(mockPush).toHaveBeenCalledWith(`/admin/articles/${testId}/publish`);
  });

  it('should pass edited content fields to updateArticle with draft status', async () => {
    mockUpdateArticle.mockResolvedValue({ success: true, id: testId });

    render(
      <EditArticleForm
        id={testId}
        defaultValues={defaultValues}
        categories={[]}
        labels={defaultLabels}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Article title'), {
      target: { value: 'Updated Title' },
    });

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
      excerpt: null,
      description: null,
      categoryId: null,
      icon: null,
    });
  });

  // --- articles-specific: NO visibility or notification in update data ---

  it('should NOT include visibility in update data (articles have no visibility)', async () => {
    mockUpdateArticle.mockResolvedValue({ success: true, id: testId });

    render(
      <EditArticleForm
        id={testId}
        defaultValues={defaultValues}
        categories={[]}
        labels={defaultLabels}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
    });

    const callArgs = mockUpdateArticle.mock.calls[0][1];
    expect('visibility' in callArgs).toBe(false);
  });

  it('should NOT include sendNotification in update data (articles have no notification)', async () => {
    mockUpdateArticle.mockResolvedValue({ success: true, id: testId });

    render(
      <EditArticleForm
        id={testId}
        defaultValues={defaultValues}
        categories={[]}
        labels={defaultLabels}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
    });

    const callArgs = mockUpdateArticle.mock.calls[0][1];
    expect('sendNotification' in callArgs).toBe(false);
  });

  // --- New fields initial values and empty→null conversion ---

  it('should populate new fields with initial values from defaultValues', () => {
    const valuesWithNewFields = {
      ...defaultValues,
      excerpt: 'Existing excerpt',
      description: 'Existing description',
      categoryId: 'cat-1',
      icon: '♟️',
    };

    render(
      <EditArticleForm
        id={testId}
        defaultValues={valuesWithNewFields}
        categories={[{ id: 'cat-1', name: 'Category 1' }]}
        labels={defaultLabels}
      />
    );

    openMetadataPanel();

    expect(screen.getByLabelText('Excerpt')).toHaveValue('Existing excerpt');
    expect(screen.getByLabelText('Description (SEO)')).toHaveValue('Existing description');
    expect(screen.getByLabelText('Category')).toHaveValue('cat-1');
    expect(screen.getByLabelText('Icon')).toHaveValue('♟️');
  });

  it('should convert non-empty new field values to their string values in updateArticle call', async () => {
    mockUpdateArticle.mockResolvedValue({ success: true, id: testId });

    const valuesWithNewFields = {
      ...defaultValues,
      excerpt: 'My excerpt',
      description: 'My description',
      categoryId: 'cat-1',
      icon: '♟️',
    };

    render(
      <EditArticleForm
        id={testId}
        defaultValues={valuesWithNewFields}
        categories={[{ id: 'cat-1', name: 'Category 1' }]}
        labels={defaultLabels}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
    });

    expect(mockUpdateArticle).toHaveBeenCalledWith(
      testId,
      expect.objectContaining({
        excerpt: 'My excerpt',
        description: 'My description',
        categoryId: 'cat-1',
        icon: '♟️',
      })
    );
  });

  it('should convert empty excerpt to null when submitting', async () => {
    mockUpdateArticle.mockResolvedValue({ success: true, id: testId });

    render(
      <EditArticleForm
        id={testId}
        defaultValues={defaultValues}
        categories={[]}
        labels={defaultLabels}
      />
    );

    // excerpt defaults to '' in defaultValues, which should become null
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
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

  it('should convert cleared fields back to null', async () => {
    mockUpdateArticle.mockResolvedValue({ success: true, id: testId });

    const valuesWithNewFields = {
      ...defaultValues,
      excerpt: 'My excerpt',
      description: 'My description',
      categoryId: 'cat-1',
      icon: '♟️',
    };

    render(
      <EditArticleForm
        id={testId}
        defaultValues={valuesWithNewFields}
        categories={[{ id: 'cat-1', name: 'Category 1' }]}
        labels={defaultLabels}
      />
    );

    openMetadataPanel();

    // Clear all new fields
    fireEvent.change(screen.getByLabelText('Excerpt'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Description (SEO)'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Icon'), { target: { value: '' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
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
});
