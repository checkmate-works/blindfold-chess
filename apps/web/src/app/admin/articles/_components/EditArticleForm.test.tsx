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

const mockUseNavigationGuard = vi.fn().mockReturnValue({
  active: false,
  accept: vi.fn(),
  reject: vi.fn(),
});

vi.mock('next-navigation-guard', () => ({
  useNavigationGuard: (...args: unknown[]) => mockUseNavigationGuard(...args),
}));

// Mock TiptapEditor to a simple textarea for testing
vi.mock('./TiptapEditor', () => ({
  TiptapEditor: ({
    onChange,
    placeholder,
    ariaLabel,
  }: {
    initialContent?: unknown;
    onChange: (json: { type: 'doc'; content?: unknown[] }) => void;
    placeholder?: string;
    ariaLabel?: string;
  }) => (
    <textarea
      data-testid="tiptap-editor"
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(e) => {
        onChange({
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: e.target.value }],
            },
          ],
        });
      }}
    />
  ),
}));

// Mock MarkdownEditor to a simple textarea for testing
vi.mock('./MarkdownEditor', () => ({
  MarkdownEditor: ({
    onChange,
    placeholder,
    ariaLabel,
  }: {
    initialContent?: string;
    onChange: (markdown: string) => void;
    placeholder?: string;
    ariaLabel?: string;
  }) => (
    <textarea
      data-testid="markdown-editor"
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
    />
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
  generateSlugFromTitle: 'Generate from title',
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
  savePublished: 'Save',
  savingPublished: 'Saving...',
  publishedSaved: 'Article saved',
  publishedConfirmTitle: 'Confirm Save',
  publishedConfirmMessage:
    'This article is published. Your changes will be reflected immediately. Are you sure?',
  publishedConfirmConfirm: 'Save',
  publishedConfirmCancel: 'Cancel',
};

const defaultValues = {
  slug: 'existing-slug',
  title: 'Existing Title',
  content: 'Existing Content',
  contentJson: null,
  contentFormat: 'markdown' as const,
  locale: 'en',
  status: 'draft',
  pinnedAt: '2024-06-15T12:00',
  publishedAt: null,
  excerpt: '',
  description: '',
  categoryId: '',
  icon: '',
};

const publishedValues = {
  ...defaultValues,
  status: 'published',
  publishedAt: '2024-06-15T14:00',
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

    expect(mockUpdateArticle).toHaveBeenCalledWith(
      testId,
      expect.objectContaining({
        slug: 'existing-slug',
        title: 'Existing Title',
        locale: 'en',
        status: 'draft',
        contentFormat: 'markdown',
        pinnedAt: '2024-06-15T12:00',
        publishedAt: null,
        excerpt: null,
        description: null,
        categoryId: null,
        icon: null,
      })
    );
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

    expect(mockUpdateArticle).toHaveBeenCalledWith(
      testId,
      expect.objectContaining({
        slug: 'existing-slug',
        title: 'Existing Title',
        status: 'draft',
        contentFormat: 'markdown',
      })
    );
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

    expect(mockUpdateArticle).toHaveBeenCalledWith(
      testId,
      expect.objectContaining({
        slug: 'existing-slug',
        title: 'Updated Title',
        status: 'draft',
        contentFormat: 'markdown',
      })
    );
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

  // --- Markdown format: contentFormat preservation ---

  it('should render MarkdownEditor for markdown contentFormat articles', () => {
    render(
      <EditArticleForm
        id={testId}
        defaultValues={defaultValues}
        categories={[]}
        labels={defaultLabels}
      />
    );

    expect(screen.getByTestId('markdown-editor')).toBeInTheDocument();
    expect(screen.queryByTestId('tiptap-editor')).not.toBeInTheDocument();
  });

  it('should render TiptapEditor for tiptap_json contentFormat articles', () => {
    const tiptapValues = {
      ...defaultValues,
      contentFormat: 'tiptap_json' as const,
      contentJson: { type: 'doc' as const, content: [] },
    };

    render(
      <EditArticleForm
        id={testId}
        defaultValues={tiptapValues}
        categories={[]}
        labels={defaultLabels}
      />
    );

    expect(screen.getByTestId('tiptap-editor')).toBeInTheDocument();
    expect(screen.queryByTestId('markdown-editor')).not.toBeInTheDocument();
  });

  it('should preserve markdown contentFormat when saving', async () => {
    mockUpdateArticle.mockResolvedValue({ success: true, id: testId });

    render(
      <EditArticleForm
        id={testId}
        defaultValues={defaultValues}
        categories={[]}
        labels={defaultLabels}
      />
    );

    fireEvent.change(screen.getByTestId('markdown-editor'), {
      target: { value: '# Updated markdown' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
    });

    expect(mockUpdateArticle).toHaveBeenCalledWith(
      testId,
      expect.objectContaining({
        contentFormat: 'markdown',
        contentJson: null,
      })
    );
    // content should contain the markdown text (passed through from ArticleForm)
    const callArgs = mockUpdateArticle.mock.calls[0][1];
    expect(callArgs.contentFormat).toBe('markdown');
  });

  it('should preserve tiptap_json contentFormat when saving', async () => {
    mockUpdateArticle.mockResolvedValue({ success: true, id: testId });

    const tiptapValues = {
      ...defaultValues,
      contentFormat: 'tiptap_json' as const,
      contentJson: { type: 'doc' as const, content: [] },
    };

    render(
      <EditArticleForm
        id={testId}
        defaultValues={tiptapValues}
        categories={[]}
        labels={defaultLabels}
      />
    );

    fireEvent.change(screen.getByTestId('tiptap-editor'), {
      target: { value: 'Tiptap content' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
    });

    expect(mockUpdateArticle).toHaveBeenCalledWith(
      testId,
      expect.objectContaining({
        contentFormat: 'tiptap_json',
      })
    );
  });

  // --- Markdown mode: pinnedAt / publishedAt preservation ---

  it('should preserve pinnedAt and publishedAt when saving markdown article', async () => {
    mockUpdateArticle.mockResolvedValue({ success: true, id: testId });

    const valuesWithDates = {
      ...defaultValues,
      pinnedAt: '2024-06-15T12:00',
      publishedAt: '2024-06-15T14:00',
    };

    render(
      <EditArticleForm
        id={testId}
        defaultValues={valuesWithDates}
        categories={[]}
        labels={defaultLabels}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
    });

    expect(mockUpdateArticle).toHaveBeenCalledWith(
      testId,
      expect.objectContaining({
        pinnedAt: '2024-06-15T12:00',
        publishedAt: '2024-06-15T14:00',
      })
    );
  });

  it('should handle null pinnedAt and publishedAt', async () => {
    mockUpdateArticle.mockResolvedValue({ success: true, id: testId });

    const valuesNullDates = {
      ...defaultValues,
      pinnedAt: null,
      publishedAt: null,
    };

    render(
      <EditArticleForm
        id={testId}
        defaultValues={valuesNullDates}
        categories={[]}
        labels={defaultLabels}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
    });

    expect(mockUpdateArticle).toHaveBeenCalledWith(
      testId,
      expect.objectContaining({
        pinnedAt: null,
        publishedAt: null,
      })
    );
  });

  // --- Markdown mode: editing content and submitting ---

  it('should submit edited markdown content via MarkdownEditor', async () => {
    mockUpdateArticle.mockResolvedValue({ success: true, id: testId });

    const markdownValues = {
      ...defaultValues,
      content: '# Original',
    };

    render(
      <EditArticleForm
        id={testId}
        defaultValues={markdownValues}
        categories={[]}
        labels={defaultLabels}
      />
    );

    fireEvent.change(screen.getByTestId('markdown-editor'), {
      target: { value: '# Edited Content\n\nNew paragraph' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
    });

    const callArgs = mockUpdateArticle.mock.calls[0][1];
    expect(callArgs.contentFormat).toBe('markdown');
    expect(callArgs.contentJson).toBeNull();
  });

  // --- Markdown mode: special characters ---

  it('should handle special characters in markdown content', async () => {
    mockUpdateArticle.mockResolvedValue({ success: true, id: testId });

    render(
      <EditArticleForm
        id={testId}
        defaultValues={defaultValues}
        categories={[]}
        labels={defaultLabels}
      />
    );

    const specialContent = '# <script>alert("xss")</script>\n\n```\n<div>&nbsp;</div>\n```';
    fireEvent.change(screen.getByTestId('markdown-editor'), {
      target: { value: specialContent },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
    });

    expect(mockUpdateArticle).toHaveBeenCalledWith(
      testId,
      expect.objectContaining({
        contentFormat: 'markdown',
      })
    );
  });

  // --- Markdown mode: empty content submission ---

  it('should submit empty content in markdown mode without error', async () => {
    mockUpdateArticle.mockResolvedValue({ success: true, id: testId });

    const markdownValues = {
      ...defaultValues,
      content: '',
    };

    render(
      <EditArticleForm
        id={testId}
        defaultValues={markdownValues}
        categories={[]}
        labels={defaultLabels}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
    });

    expect(mockUpdateArticle).toHaveBeenCalledWith(
      testId,
      expect.objectContaining({
        contentFormat: 'markdown',
        contentJson: null,
      })
    );
  });

  // --- Publish Settings navigation in markdown mode ---

  it('should navigate to publish page after Publish Settings in markdown mode', async () => {
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

    expect(mockUpdateArticle).toHaveBeenCalledWith(
      testId,
      expect.objectContaining({
        contentFormat: 'markdown',
        status: 'draft',
      })
    );
    expect(mockPush).toHaveBeenCalledWith(`/admin/articles/${testId}/publish`);
  });

  // --- Published article behavior ---

  it('should show Save button instead of Save Draft for published articles', () => {
    render(
      <EditArticleForm
        id={testId}
        defaultValues={publishedValues}
        categories={[]}
        labels={defaultLabels}
      />
    );

    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save Draft' })).not.toBeInTheDocument();
  });

  it('should show confirmation modal when Save is clicked for published articles', async () => {
    render(
      <EditArticleForm
        id={testId}
        defaultValues={publishedValues}
        categories={[]}
        labels={defaultLabels}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });

    expect(
      screen.getByText(
        'This article is published. Your changes will be reflected immediately. Are you sure?'
      )
    ).toBeInTheDocument();
    expect(mockUpdateArticle).not.toHaveBeenCalled();
  });

  it('should call updateArticle with status published after confirming save on published article', async () => {
    mockUpdateArticle.mockResolvedValue({ success: true, id: testId });

    render(
      <EditArticleForm
        id={testId}
        defaultValues={publishedValues}
        categories={[]}
        labels={defaultLabels}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });

    // Confirm in the modal
    await act(async () => {
      const confirmButtons = screen.getAllByRole('button', { name: 'Save' });
      // The confirm button in the modal is the second "Save" button
      fireEvent.click(confirmButtons[confirmButtons.length - 1]);
    });

    expect(mockUpdateArticle).toHaveBeenCalledWith(
      testId,
      expect.objectContaining({
        status: 'published',
        publishedAt: '2024-06-15T14:00',
      })
    );
  });

  it('should not call updateArticle when cancelling confirmation modal on published article', async () => {
    render(
      <EditArticleForm
        id={testId}
        defaultValues={publishedValues}
        categories={[]}
        labels={defaultLabels}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });

    // Cancel in the modal (there are multiple Cancel buttons — top bar and modal)
    await act(async () => {
      const cancelButtons = screen.getAllByRole('button', { name: 'Cancel' });
      fireEvent.click(cancelButtons[cancelButtons.length - 1]);
    });

    expect(mockUpdateArticle).not.toHaveBeenCalled();
  });

  // --- isPublished determination tests ---

  it('should treat status=published with publishedAt as published (isPublished=true)', () => {
    const values = {
      ...defaultValues,
      status: 'published',
      publishedAt: '2024-06-15T14:00',
    };

    render(
      <EditArticleForm id={testId} defaultValues={values} categories={[]} labels={defaultLabels} />
    );

    // Published article should show "Save" button (not "Save Draft")
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save Draft' })).not.toBeInTheDocument();
  });

  it('should treat status=draft as not published (isPublished=false)', () => {
    const values = {
      ...defaultValues,
      status: 'draft',
      publishedAt: null,
    };

    render(
      <EditArticleForm id={testId} defaultValues={values} categories={[]} labels={defaultLabels} />
    );

    // Draft article should show "Save Draft" button (not "Save")
    expect(screen.getByRole('button', { name: 'Save Draft' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
  });

  it('should treat status=published with publishedAt=null as not published (isPublished=false)', () => {
    const values = {
      ...defaultValues,
      status: 'published',
      publishedAt: null,
    };

    render(
      <EditArticleForm id={testId} defaultValues={values} categories={[]} labels={defaultLabels} />
    );

    // Without publishedAt, even with status=published, should show "Save Draft"
    expect(screen.getByRole('button', { name: 'Save Draft' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
  });

  it('should treat status=draft with publishedAt set as not published (isPublished=false)', () => {
    const values = {
      ...defaultValues,
      status: 'draft',
      publishedAt: '2024-06-15T14:00',
    };

    render(
      <EditArticleForm id={testId} defaultValues={values} categories={[]} labels={defaultLabels} />
    );

    // Even with publishedAt set, draft status should show "Save Draft"
    expect(screen.getByRole('button', { name: 'Save Draft' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
  });

  // --- Published article: status preservation ---

  it('should preserve status=published when saving a published article', async () => {
    mockUpdateArticle.mockResolvedValue({ success: true, id: testId });

    render(
      <EditArticleForm
        id={testId}
        defaultValues={publishedValues}
        categories={[]}
        labels={defaultLabels}
      />
    );

    // Click Save (opens modal)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });

    // Confirm in modal
    const saveButtons = screen.getAllByRole('button', { name: 'Save' });
    await act(async () => {
      fireEvent.click(saveButtons[saveButtons.length - 1]);
    });

    expect(mockUpdateArticle).toHaveBeenCalledWith(
      testId,
      expect.objectContaining({
        status: 'published',
      })
    );
  });

  it('should preserve status=draft when saving a draft article', async () => {
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

    expect(mockUpdateArticle).toHaveBeenCalledWith(
      testId,
      expect.objectContaining({
        status: 'draft',
      })
    );
  });

  // --- Publish Settings navigation guard suppression ---

  it('should disable navigation guard when Publish Settings is clicked on draft article', async () => {
    mockUpdateArticle.mockResolvedValue({ success: true, id: testId });

    render(
      <EditArticleForm
        id={testId}
        defaultValues={defaultValues}
        categories={[]}
        labels={defaultLabels}
      />
    );

    // Make the form dirty
    fireEvent.change(screen.getByPlaceholderText('Article title'), {
      target: { value: 'Changed Title' },
    });

    // Before clicking, guard should be enabled (dirty)
    const callsBeforeClick = mockUseNavigationGuard.mock.calls;
    const lastCallBeforeClick = callsBeforeClick[callsBeforeClick.length - 1];
    expect(lastCallBeforeClick[0]).toEqual({ enabled: true });

    // Click Publish Settings
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Publish Settings' }));
    });

    // Navigation guard should be disabled for Publish Settings transition
    const callsAfterClick = mockUseNavigationGuard.mock.calls;
    const lastCallAfterClick = callsAfterClick[callsAfterClick.length - 1];
    expect(lastCallAfterClick[0]).toEqual({ enabled: false });

    // Should still navigate
    expect(mockPush).toHaveBeenCalledWith(`/admin/articles/${testId}/publish`);
  });

  it('should disable navigation guard when Publish Settings is clicked on published article', async () => {
    mockUpdateArticle.mockResolvedValue({ success: true, id: testId });

    render(
      <EditArticleForm
        id={testId}
        defaultValues={publishedValues}
        categories={[]}
        labels={defaultLabels}
      />
    );

    // Make the form dirty
    fireEvent.change(screen.getByPlaceholderText('Article title'), {
      target: { value: 'Changed Published Title' },
    });

    // Before clicking, guard should be enabled (dirty)
    const callsBeforeClick = mockUseNavigationGuard.mock.calls;
    const lastCallBeforeClick = callsBeforeClick[callsBeforeClick.length - 1];
    expect(lastCallBeforeClick[0]).toEqual({ enabled: true });

    // Click Publish Settings
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Publish Settings' }));
    });

    // Navigation guard should be disabled
    const callsAfterClick = mockUseNavigationGuard.mock.calls;
    const lastCallAfterClick = callsAfterClick[callsAfterClick.length - 1];
    expect(lastCallAfterClick[0]).toEqual({ enabled: false });

    expect(mockPush).toHaveBeenCalledWith(`/admin/articles/${testId}/publish`);
  });

  it('should re-enable navigation guard when Publish Settings save fails on draft article', async () => {
    mockUpdateArticle.mockResolvedValue({ error: 'Validation error' });

    render(
      <EditArticleForm
        id={testId}
        defaultValues={defaultValues}
        categories={[]}
        labels={defaultLabels}
      />
    );

    // Make the form dirty
    fireEvent.change(screen.getByPlaceholderText('Article title'), {
      target: { value: 'Changed Title' },
    });

    // Click Publish Settings (will fail)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Publish Settings' }));
    });

    // Error should be displayed
    expect(screen.getByText('Validation error')).toBeInTheDocument();

    // Navigation guard should be re-enabled after error
    const callsAfterError = mockUseNavigationGuard.mock.calls;
    const lastCallAfterError = callsAfterError[callsAfterError.length - 1];
    expect(lastCallAfterError[0]).toEqual({ enabled: true });

    // Should NOT have navigated
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should re-enable navigation guard when Publish Settings save fails on published article', async () => {
    mockUpdateArticle.mockResolvedValue({ error: 'Server error' });

    render(
      <EditArticleForm
        id={testId}
        defaultValues={publishedValues}
        categories={[]}
        labels={defaultLabels}
      />
    );

    // Make the form dirty
    fireEvent.change(screen.getByPlaceholderText('Article title'), {
      target: { value: 'Changed Published Title' },
    });

    // Click Publish Settings (will fail)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Publish Settings' }));
    });

    // Error should be displayed
    expect(screen.getByText('Server error')).toBeInTheDocument();

    // Navigation guard should be re-enabled after error
    const callsAfterError = mockUseNavigationGuard.mock.calls;
    const lastCallAfterError = callsAfterError[callsAfterError.length - 1];
    expect(lastCallAfterError[0]).toEqual({ enabled: true });

    // Should NOT have navigated
    expect(mockPush).not.toHaveBeenCalled();
  });
});
