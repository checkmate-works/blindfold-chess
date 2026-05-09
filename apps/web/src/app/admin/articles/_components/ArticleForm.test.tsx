import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ArticleForm } from './ArticleForm';

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
    onChange: (json: Record<string, unknown>) => void;
    placeholder?: string;
    ariaLabel?: string;
  }) => (
    <textarea
      data-testid="tiptap-editor"
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(e) => {
        // Simulate Tiptap JSON output
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
    defaultContent?: string;
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

const mockShowToast = vi.fn();

vi.mock('@/app/[locale]/_contexts/ToastContext', () => ({
  useToast: () => ({
    toasts: [],
    showToast: mockShowToast,
    hideToast: vi.fn(),
  }),
}));

const defaultLabels = {
  formTitle: 'Create Article',
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
  savePublished: 'Save',
  savingPublished: 'Saving...',
  publishedSaved: 'Article saved',
  publishedConfirmTitle: 'Confirm Save',
  publishedConfirmMessage:
    'This article is published. Your changes will be reflected immediately. Are you sure?',
  publishedConfirmConfirm: 'Save',
  publishedConfirmCancel: 'Cancel',
};

function openMetadataPanel() {
  fireEvent.click(screen.getByTitle('Metadata'));
}

describe('ArticleForm', () => {
  // ArticleForm calls `window.location.replace(...)` after a successful save of
  // a new article (see `redirectAfterSave`). jsdom does not implement real
  // navigation, so without a stub every "new article save" test would emit
  // "Not implemented: navigation to another Document" on stderr. Install the
  // stub here so individual tests do not need to remember.
  let originalLocation: Location;
  beforeEach(() => {
    vi.clearAllMocks();
    originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, replace: vi.fn(), assign: vi.fn() },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });

  it('should render title field and Tiptap editor', () => {
    const mockOnSaveDraft = vi.fn();

    render(<ArticleForm onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />);

    expect(screen.getByPlaceholderText('Article title')).toBeInTheDocument();
    expect(screen.getByTestId('tiptap-editor')).toBeInTheDocument();
  });

  it('should render slug and locale in the editor pane', () => {
    const mockOnSaveDraft = vi.fn();

    render(<ArticleForm onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />);

    expect(screen.getByLabelText('Slug')).toBeInTheDocument();
    expect(screen.getByLabelText('Locale')).toBeInTheDocument();
  });

  it('should render metadata fields in the side panel when opened', () => {
    const mockOnSaveDraft = vi.fn();

    render(<ArticleForm onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />);

    openMetadataPanel();

    expect(screen.getByLabelText('Excerpt')).toBeInTheDocument();
    expect(screen.getByLabelText('Description (SEO)')).toBeInTheDocument();
    expect(screen.getByLabelText('Category')).toBeInTheDocument();
    expect(screen.getByLabelText('Icon')).toBeInTheDocument();
  });

  it('should render Save Draft, Publish Settings, and Cancel buttons', () => {
    const mockOnSaveDraft = vi.fn();

    render(<ArticleForm onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />);

    expect(screen.getByRole('button', { name: 'Save Draft' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish Settings' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('should not render Status, Visibility, Pinned At, or Published At fields', () => {
    const mockOnSaveDraft = vi.fn();

    render(<ArticleForm onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />);

    openMetadataPanel();

    expect(screen.queryByLabelText('Status')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Visibility')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Pinned At')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Published At')).not.toBeInTheDocument();
  });

  it('should populate form with default values', () => {
    const mockOnSaveDraft = vi.fn();
    const defaults = {
      slug: 'my-slug',
      title: 'My Title',
      content: 'My Content',
      contentJson: null,
      contentFormat: 'tiptap_json' as const,
      locale: 'ja',
      excerpt: 'My Excerpt',
      description: 'My Description',
      categoryId: 'cat-1',
      icon: '♟️',
    };

    render(
      <ArticleForm
        defaultValues={defaults}
        categories={[{ id: 'cat-1', name: 'Category 1' }]}
        onSaveDraft={mockOnSaveDraft}
        labels={defaultLabels}
      />
    );

    expect(screen.getByLabelText('Slug')).toHaveValue('my-slug');
    expect(screen.getByPlaceholderText('Article title')).toHaveValue('My Title');
    expect(screen.getByLabelText('Locale')).toHaveValue('ja');

    openMetadataPanel();

    expect(screen.getByLabelText('Excerpt')).toHaveValue('My Excerpt');
    expect(screen.getByLabelText('Description (SEO)')).toHaveValue('My Description');
    expect(screen.getByLabelText('Category')).toHaveValue('cat-1');
    expect(screen.getByLabelText('Icon')).toHaveValue('♟️');
  });

  it('should call onSaveDraft with form data including contentJson and show toast', async () => {
    const mockOnSaveDraft = vi.fn().mockResolvedValue({ success: true, id: 'test-id' });

    render(<ArticleForm onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />);

    fireEvent.change(screen.getByLabelText('Slug'), { target: { value: 'test-slug' } });
    fireEvent.change(screen.getByPlaceholderText('Article title'), {
      target: { value: 'Test Title' },
    });
    fireEvent.change(screen.getByTestId('tiptap-editor'), {
      target: { value: 'Test Content' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
    });

    expect(mockOnSaveDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'test-slug',
        title: 'Test Title',
        contentFormat: 'tiptap_json',
        contentJson: expect.objectContaining({ type: 'doc' }),
      })
    );
    expect(mockPush).not.toHaveBeenCalled();
    expect(window.location.replace).toHaveBeenCalledWith('/admin/articles/test-id/edit');
    expect(mockShowToast).toHaveBeenCalledWith('Draft saved', 'success');
  });

  it('should call onSaveDraft and navigate to publish page on Publish Settings', async () => {
    const mockOnSaveDraft = vi.fn().mockResolvedValue({ success: true, id: 'generated-id' });

    render(<ArticleForm onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />);

    fireEvent.change(screen.getByLabelText('Slug'), { target: { value: 'preview-slug' } });
    fireEvent.change(screen.getByPlaceholderText('Article title'), {
      target: { value: 'Preview Title' },
    });
    fireEvent.change(screen.getByTestId('tiptap-editor'), {
      target: { value: 'Preview Content' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Publish Settings' }));
    });

    expect(mockOnSaveDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'preview-slug',
        title: 'Preview Title',
        contentFormat: 'tiptap_json',
      })
    );
    expect(mockPush).toHaveBeenCalledWith('/admin/articles/generated-id/publish');
  });

  it('should display error message when onSaveDraft returns an error on Save Draft', async () => {
    const mockOnSaveDraft = vi.fn().mockResolvedValue({ error: 'invalid slug' });

    render(<ArticleForm onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
    });

    expect(screen.getByText('invalid slug')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should display error message when onSaveDraft returns an error on Publish Settings', async () => {
    const mockOnSaveDraft = vi.fn().mockResolvedValue({ error: 'invalid title' });

    render(<ArticleForm onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Publish Settings' }));
    });

    expect(screen.getByText('invalid title')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should navigate to articles list on Cancel', () => {
    const mockOnSaveDraft = vi.fn();

    render(<ArticleForm onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(mockPush).toHaveBeenCalledWith('/admin/articles');
    expect(mockOnSaveDraft).not.toHaveBeenCalled();
  });

  // --- Category dropdown tests ---

  it('should render category options passed via categories prop', () => {
    const mockOnSaveDraft = vi.fn();
    const categories = [
      { id: 'cat-1', name: 'Openings' },
      { id: 'cat-2', name: 'Endgames' },
      { id: 'cat-3', name: 'Tactics' },
    ];

    render(
      <ArticleForm onSaveDraft={mockOnSaveDraft} categories={categories} labels={defaultLabels} />
    );

    openMetadataPanel();

    const categorySelect = screen.getByLabelText('Category');
    expect(categorySelect).toBeInTheDocument();

    // "None" option should always exist
    const options = categorySelect.querySelectorAll('option');
    expect(options).toHaveLength(4); // None + 3 categories
    expect(options[0]).toHaveTextContent('None');
    expect(options[1]).toHaveTextContent('Openings');
    expect(options[2]).toHaveTextContent('Endgames');
    expect(options[3]).toHaveTextContent('Tactics');
  });

  it('should submit with empty categoryId when no category is selected', async () => {
    const mockOnSaveDraft = vi.fn().mockResolvedValue({ success: true, id: 'test-id' });

    render(<ArticleForm onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />);

    fireEvent.change(screen.getByLabelText('Slug'), { target: { value: 'test' } });
    fireEvent.change(screen.getByPlaceholderText('Article title'), { target: { value: 'Test' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
    });

    expect(mockOnSaveDraft).toHaveBeenCalledWith(expect.objectContaining({ categoryId: '' }));
  });

  // --- Icon field input and submit ---

  it('should submit icon value entered by user', async () => {
    const mockOnSaveDraft = vi.fn().mockResolvedValue({ success: true, id: 'test-id' });

    render(<ArticleForm onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />);

    fireEvent.change(screen.getByLabelText('Slug'), { target: { value: 'test' } });
    fireEvent.change(screen.getByPlaceholderText('Article title'), { target: { value: 'Test' } });

    openMetadataPanel();
    fireEvent.change(screen.getByLabelText('Icon'), { target: { value: '♟️' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
    });

    expect(mockOnSaveDraft).toHaveBeenCalledWith(expect.objectContaining({ icon: '♟️' }));
  });

  // --- New fields input and submit ---

  it('should submit all fields with entered values', async () => {
    const mockOnSaveDraft = vi.fn().mockResolvedValue({ success: true, id: 'test-id' });
    const categories = [{ id: 'cat-1', name: 'Openings' }];

    render(
      <ArticleForm onSaveDraft={mockOnSaveDraft} categories={categories} labels={defaultLabels} />
    );

    fireEvent.change(screen.getByLabelText('Slug'), { target: { value: 'test' } });
    fireEvent.change(screen.getByPlaceholderText('Article title'), { target: { value: 'Test' } });
    fireEvent.change(screen.getByTestId('tiptap-editor'), {
      target: { value: 'Content' },
    });

    openMetadataPanel();
    fireEvent.change(screen.getByLabelText('Excerpt'), { target: { value: 'A brief summary' } });
    fireEvent.change(screen.getByLabelText('Description (SEO)'), {
      target: { value: 'Meta desc' },
    });
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'cat-1' } });
    fireEvent.change(screen.getByLabelText('Icon'), { target: { value: '♟️' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
    });

    expect(mockOnSaveDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'test',
        title: 'Test',
        contentFormat: 'tiptap_json',
        contentJson: expect.objectContaining({ type: 'doc' }),
        locale: 'en',
        excerpt: 'A brief summary',
        description: 'Meta desc',
        categoryId: 'cat-1',
        icon: '♟️',
      })
    );
  });

  it('should render with empty categories array by default', () => {
    const mockOnSaveDraft = vi.fn();

    render(<ArticleForm onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />);

    openMetadataPanel();

    const categorySelect = screen.getByLabelText('Category');
    const options = categorySelect.querySelectorAll('option');
    // Only "None" option
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent('None');
  });

  // --- Metadata panel toggle tests ---

  it('should hide metadata panel fields by default', () => {
    const mockOnSaveDraft = vi.fn();

    render(<ArticleForm onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />);

    // Slug and Locale are always visible in the editor pane
    expect(screen.getByLabelText('Slug')).toBeInTheDocument();
    expect(screen.getByLabelText('Locale')).toBeInTheDocument();

    // Panel fields are hidden by default
    expect(screen.queryByLabelText('Excerpt')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Category')).not.toBeInTheDocument();
  });

  it('should toggle metadata panel on gear button click', () => {
    const mockOnSaveDraft = vi.fn();

    render(<ArticleForm onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />);

    // Open
    openMetadataPanel();
    expect(screen.getByLabelText('Excerpt')).toBeInTheDocument();

    // Close via close button
    fireEvent.click(screen.getByRole('button', { name: 'Close metadata' }));

    expect(screen.queryByLabelText('Excerpt')).not.toBeInTheDocument();
  });

  // --- Metadata panel data persistence ---

  it('should preserve metadata values after closing and reopening the panel', () => {
    const mockOnSaveDraft = vi.fn();

    render(
      <ArticleForm
        onSaveDraft={mockOnSaveDraft}
        categories={[{ id: 'cat-1', name: 'Category 1' }]}
        labels={defaultLabels}
      />
    );

    // Open panel and fill in data
    openMetadataPanel();
    fireEvent.change(screen.getByLabelText('Excerpt'), { target: { value: 'My excerpt' } });
    fireEvent.change(screen.getByLabelText('Icon'), { target: { value: '♟️' } });

    // Close the panel
    fireEvent.click(screen.getByRole('button', { name: 'Close metadata' }));
    expect(screen.queryByLabelText('Excerpt')).not.toBeInTheDocument();

    // Reopen the panel and verify data is preserved
    openMetadataPanel();
    expect(screen.getByLabelText('Excerpt')).toHaveValue('My excerpt');
    expect(screen.getByLabelText('Icon')).toHaveValue('♟️');
  });

  // --- Button disabled state during submission ---

  it('should disable Save Draft, Preview, and Cancel buttons while saving', async () => {
    let resolvePromise: (value: { success: true; id: string }) => void;
    const pendingPromise = new Promise<{ success: true; id: string }>((resolve) => {
      resolvePromise = resolve;
    });
    const mockOnSaveDraft = vi.fn().mockReturnValue(pendingPromise);

    render(<ArticleForm onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />);

    // Start saving (don't await so we can check disabled state)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
      // Let the transition start
      await Promise.resolve();
    });

    // Buttons should show saving state
    expect(screen.getByText('Saving...')).toBeInTheDocument();

    // Resolve to clean up
    await act(async () => {
      resolvePromise!({ success: true, id: 'test-id' });
    });
  });

  // --- Accessibility: aria-label presence ---

  it('should have aria-label on title input and Tiptap editor', () => {
    const mockOnSaveDraft = vi.fn();

    render(<ArticleForm onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />);

    expect(screen.getByPlaceholderText('Article title')).toHaveAttribute('aria-label', 'Title');
    expect(screen.getByTestId('tiptap-editor')).toHaveAttribute('aria-label', 'Content');
  });

  it('should have aria-label on close metadata button', () => {
    const mockOnSaveDraft = vi.fn();

    render(<ArticleForm onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />);

    openMetadataPanel();

    expect(screen.getByRole('button', { name: 'Close metadata' })).toHaveAttribute(
      'aria-label',
      'Close metadata'
    );
  });

  // --- Markdown editor tests ---

  it('should render MarkdownEditor when contentFormat is markdown', () => {
    const mockOnSaveDraft = vi.fn();

    render(
      <ArticleForm contentFormat="markdown" onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />
    );

    expect(screen.getByTestId('markdown-editor')).toBeInTheDocument();
    expect(screen.queryByTestId('tiptap-editor')).not.toBeInTheDocument();
  });

  it('should render TiptapEditor when contentFormat is tiptap_json', () => {
    const mockOnSaveDraft = vi.fn();

    render(
      <ArticleForm
        contentFormat="tiptap_json"
        onSaveDraft={mockOnSaveDraft}
        labels={defaultLabels}
      />
    );

    expect(screen.getByTestId('tiptap-editor')).toBeInTheDocument();
    expect(screen.queryByTestId('markdown-editor')).not.toBeInTheDocument();
  });

  it('should default to TiptapEditor when contentFormat is not specified', () => {
    const mockOnSaveDraft = vi.fn();

    render(<ArticleForm onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />);

    expect(screen.getByTestId('tiptap-editor')).toBeInTheDocument();
    expect(screen.queryByTestId('markdown-editor')).not.toBeInTheDocument();
  });

  it('should submit with contentFormat markdown and content from MarkdownEditor', async () => {
    const mockOnSaveDraft = vi.fn().mockResolvedValue({ success: true, id: 'test-id' });

    render(
      <ArticleForm
        contentFormat="markdown"
        defaultValues={{
          slug: 'md-slug',
          title: 'MD Title',
          content: '# Hello',
          contentJson: null,
          contentFormat: 'markdown',
          locale: 'en',
          excerpt: '',
          description: '',
          categoryId: '',
          icon: '',
        }}
        onSaveDraft={mockOnSaveDraft}
        labels={defaultLabels}
      />
    );

    fireEvent.change(screen.getByTestId('markdown-editor'), {
      target: { value: '# Updated Content' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
    });

    expect(mockOnSaveDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'md-slug',
        title: 'MD Title',
        content: '# Updated Content',
        contentJson: null,
        contentFormat: 'markdown',
      })
    );
  });

  // --- Markdown mode edge cases ---

  it('should submit empty content in markdown mode', async () => {
    const mockOnSaveDraft = vi.fn().mockResolvedValue({ success: true, id: 'test-id' });

    render(
      <ArticleForm contentFormat="markdown" onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />
    );

    fireEvent.change(screen.getByLabelText('Slug'), { target: { value: 'empty-slug' } });
    fireEvent.change(screen.getByPlaceholderText('Article title'), {
      target: { value: 'Empty Content' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
    });

    expect(mockOnSaveDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        content: '',
        contentJson: null,
        contentFormat: 'markdown',
      })
    );
  });

  it('should submit content with special characters in markdown mode', async () => {
    const mockOnSaveDraft = vi.fn().mockResolvedValue({ success: true, id: 'test-id' });
    const specialContent =
      '# Title\n\n```js\nconst x = "<div>&amp;</div>";\n```\n\n> blockquote\n\n---';

    render(
      <ArticleForm contentFormat="markdown" onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />
    );

    fireEvent.change(screen.getByTestId('markdown-editor'), {
      target: { value: specialContent },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
    });

    expect(mockOnSaveDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        content: specialContent,
        contentJson: null,
        contentFormat: 'markdown',
      })
    );
  });

  it('should submit long content in markdown mode', async () => {
    const mockOnSaveDraft = vi.fn().mockResolvedValue({ success: true, id: 'test-id' });
    const longContent = '# Long Article\n\n' + 'Lorem ipsum dolor sit amet. '.repeat(1000);

    render(
      <ArticleForm contentFormat="markdown" onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />
    );

    fireEvent.change(screen.getByTestId('markdown-editor'), {
      target: { value: longContent },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
    });

    expect(mockOnSaveDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        content: longContent,
        contentFormat: 'markdown',
      })
    );
  });

  // --- buildFormData: contentJson is null for markdown, present for tiptap_json ---

  it('should set contentJson to null when contentFormat is markdown', async () => {
    const mockOnSaveDraft = vi.fn().mockResolvedValue({ success: true, id: 'test-id' });

    render(
      <ArticleForm contentFormat="markdown" onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />
    );

    fireEvent.change(screen.getByTestId('markdown-editor'), {
      target: { value: 'Some markdown' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
    });

    const callArg = mockOnSaveDraft.mock.calls[0][0];
    expect(callArg.contentJson).toBeNull();
    expect(callArg.content).toBe('Some markdown');
  });

  it('should set contentJson to tiptap doc when contentFormat is tiptap_json', async () => {
    const mockOnSaveDraft = vi.fn().mockResolvedValue({ success: true, id: 'test-id' });

    render(
      <ArticleForm
        contentFormat="tiptap_json"
        onSaveDraft={mockOnSaveDraft}
        labels={defaultLabels}
      />
    );

    fireEvent.change(screen.getByTestId('tiptap-editor'), {
      target: { value: 'Tiptap content' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
    });

    const callArg = mockOnSaveDraft.mock.calls[0][0];
    expect(callArg.contentJson).toEqual(expect.objectContaining({ type: 'doc' }));
    expect(callArg.contentFormat).toBe('tiptap_json');
  });

  // --- isDirty detection in markdown mode ---

  it('should not have aria-label on markdown editor when ariaLabel is passed through', () => {
    // This tests that MarkdownEditor receives the aria-label from ArticleForm
    render(<ArticleForm contentFormat="markdown" onSaveDraft={vi.fn()} labels={defaultLabels} />);

    expect(screen.getByTestId('markdown-editor')).toHaveAttribute('aria-label', 'Content');
  });

  it('should pass placeholder to MarkdownEditor', () => {
    render(<ArticleForm contentFormat="markdown" onSaveDraft={vi.fn()} labels={defaultLabels} />);

    expect(screen.getByTestId('markdown-editor')).toHaveAttribute(
      'placeholder',
      'Article content...'
    );
  });

  // --- isPublished button text tests ---

  it('should show "Save Draft" button when isPublished is false', () => {
    render(<ArticleForm isPublished={false} onSaveDraft={vi.fn()} labels={defaultLabels} />);

    expect(screen.getByRole('button', { name: 'Save Draft' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
  });

  it('should show "Save" button when isPublished is true', () => {
    render(<ArticleForm isPublished={true} onSaveDraft={vi.fn()} labels={defaultLabels} />);

    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save Draft' })).not.toBeInTheDocument();
  });

  // --- isPublished confirmation modal tests ---

  it('should show confirmation modal when isPublished is true and save is clicked', async () => {
    render(<ArticleForm isPublished={true} onSaveDraft={vi.fn()} labels={defaultLabels} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });

    expect(screen.getByText('Confirm Save')).toBeInTheDocument();
    expect(
      screen.getByText(
        'This article is published. Your changes will be reflected immediately. Are you sure?'
      )
    ).toBeInTheDocument();
  });

  it('should not show confirmation modal when isPublished is false and save is clicked', async () => {
    const mockOnSaveDraft = vi.fn().mockResolvedValue({ success: true, id: 'test-id' });

    render(
      <ArticleForm isPublished={false} onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
    });

    expect(screen.queryByText('Confirm Save')).not.toBeInTheDocument();
    expect(mockOnSaveDraft).toHaveBeenCalled();
  });

  it('should not call onSaveDraft when modal cancel is clicked for published article', async () => {
    const mockOnSaveDraft = vi.fn();

    render(<ArticleForm isPublished={true} onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });

    // Click Cancel in the modal
    const cancelButtons = screen.getAllByRole('button', { name: 'Cancel' });
    await act(async () => {
      fireEvent.click(cancelButtons[cancelButtons.length - 1]);
    });

    expect(mockOnSaveDraft).not.toHaveBeenCalled();
  });

  it('should call onSaveDraft when modal confirm is clicked for published article', async () => {
    const mockOnSaveDraft = vi.fn().mockResolvedValue({ success: true, id: 'test-id' });

    render(<ArticleForm isPublished={true} onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });

    // Click the confirm button in the modal (second "Save" button)
    const saveButtons = screen.getAllByRole('button', { name: 'Save' });
    await act(async () => {
      fireEvent.click(saveButtons[saveButtons.length - 1]);
    });

    expect(mockOnSaveDraft).toHaveBeenCalled();
  });

  it('should show toast with publishedSaved message when published article is saved', async () => {
    const mockOnSaveDraft = vi.fn().mockResolvedValue({ success: true, id: 'test-id' });

    render(
      <ArticleForm
        isPublished={true}
        defaultValues={{
          slug: 'test',
          title: 'Test',
          content: '',
          contentJson: null,
          contentFormat: 'tiptap_json',
          locale: 'en',
          excerpt: '',
          description: '',
          categoryId: '',
          icon: '',
        }}
        onSaveDraft={mockOnSaveDraft}
        labels={defaultLabels}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });

    // Confirm in modal
    const saveButtons = screen.getAllByRole('button', { name: 'Save' });
    await act(async () => {
      fireEvent.click(saveButtons[saveButtons.length - 1]);
    });

    expect(mockShowToast).toHaveBeenCalledWith('Article saved', 'success');
  });

  it('should show toast with draftSaved message when draft article is saved', async () => {
    const mockOnSaveDraft = vi.fn().mockResolvedValue({ success: true, id: 'test-id' });

    render(
      <ArticleForm
        isPublished={false}
        defaultValues={{
          slug: 'test',
          title: 'Test',
          content: '',
          contentJson: null,
          contentFormat: 'tiptap_json',
          locale: 'en',
          excerpt: '',
          description: '',
          categoryId: '',
          icon: '',
        }}
        onSaveDraft={mockOnSaveDraft}
        labels={defaultLabels}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
    });

    expect(mockShowToast).toHaveBeenCalledWith('Draft saved', 'success');
  });

  // --- Double-click prevention during submission ---

  it('should disable Save button while submitting for published article', async () => {
    let resolvePromise: (value: { success: true; id: string }) => void;
    const pendingPromise = new Promise<{ success: true; id: string }>((resolve) => {
      resolvePromise = resolve;
    });
    const mockOnSaveDraft = vi.fn().mockReturnValue(pendingPromise);

    render(<ArticleForm isPublished={true} onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />);

    // Open modal
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });

    // Confirm in modal
    const saveButtons = screen.getAllByRole('button', { name: 'Save' });
    await act(async () => {
      fireEvent.click(saveButtons[saveButtons.length - 1]);
      await Promise.resolve();
    });

    // Button should show saving state
    expect(screen.getByText('Saving...')).toBeInTheDocument();

    // Resolve to clean up
    await act(async () => {
      resolvePromise!({ success: true, id: 'test-id' });
    });
  });

  it('should close confirmation modal after confirming save', async () => {
    const mockOnSaveDraft = vi.fn().mockResolvedValue({ success: true, id: 'test-id' });

    render(
      <ArticleForm
        isPublished={true}
        defaultValues={{
          slug: 'test',
          title: 'Test',
          content: '',
          contentJson: null,
          contentFormat: 'tiptap_json',
          locale: 'en',
          excerpt: '',
          description: '',
          categoryId: '',
          icon: '',
        }}
        onSaveDraft={mockOnSaveDraft}
        labels={defaultLabels}
      />
    );

    // Open modal
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });

    expect(screen.getByText('Confirm Save')).toBeInTheDocument();

    // Confirm in modal
    const saveButtons = screen.getAllByRole('button', { name: 'Save' });
    await act(async () => {
      fireEvent.click(saveButtons[saveButtons.length - 1]);
    });

    // Modal should be closed
    expect(screen.queryByText('Confirm Save')).not.toBeInTheDocument();
  });

  // --- Markdown mode: Publish Settings navigation ---

  it('should navigate to publish page after save in markdown mode', async () => {
    const mockOnSaveDraft = vi.fn().mockResolvedValue({ success: true, id: 'md-id' });

    render(
      <ArticleForm contentFormat="markdown" onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />
    );

    fireEvent.change(screen.getByTestId('markdown-editor'), {
      target: { value: '# Markdown article' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Publish Settings' }));
    });

    expect(mockOnSaveDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        contentFormat: 'markdown',
        content: '# Markdown article',
      })
    );
    expect(mockPush).toHaveBeenCalledWith('/admin/articles/md-id/publish');
  });

  // --- Markdown mode: error handling ---

  it('should display error when save fails in markdown mode', async () => {
    const mockOnSaveDraft = vi.fn().mockResolvedValue({ error: 'Content too long' });

    render(
      <ArticleForm contentFormat="markdown" onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />
    );

    fireEvent.change(screen.getByTestId('markdown-editor'), {
      target: { value: '# Test' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
    });

    expect(screen.getByText('Content too long')).toBeInTheDocument();
  });

  // --- Publish Settings navigation guard suppression ---

  it('should disable navigation guard when Publish Settings is clicked with dirty form', async () => {
    const mockOnSaveDraft = vi.fn().mockResolvedValue({ success: true, id: 'pub-id' });

    render(<ArticleForm onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />);

    // Make the form dirty
    fireEvent.change(screen.getByPlaceholderText('Article title'), {
      target: { value: 'Dirty Title' },
    });

    // Before clicking Publish Settings, isDirty should be true
    const callsBeforeClick = mockUseNavigationGuard.mock.calls;
    const lastCallBeforeClick = callsBeforeClick[callsBeforeClick.length - 1];
    expect(lastCallBeforeClick[0]).toEqual({ enabled: true });

    // Click Publish Settings
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Publish Settings' }));
    });

    // After clicking, navigation guard should be disabled (isDirty && !isNavigatingToPublish = false)
    const callsAfterClick = mockUseNavigationGuard.mock.calls;
    const lastCallAfterClick = callsAfterClick[callsAfterClick.length - 1];
    expect(lastCallAfterClick[0]).toEqual({ enabled: false });
  });

  it('should disable navigation guard for published articles when Publish Settings is clicked', async () => {
    const mockOnSaveDraft = vi.fn().mockResolvedValue({ success: true, id: 'pub-id' });

    render(
      <ArticleForm
        isPublished={true}
        defaultValues={{
          slug: 'test',
          title: 'Test',
          content: '',
          contentJson: null,
          contentFormat: 'tiptap_json',
          locale: 'en',
          excerpt: '',
          description: '',
          categoryId: '',
          icon: '',
        }}
        onSaveDraft={mockOnSaveDraft}
        labels={defaultLabels}
      />
    );

    // Make the form dirty
    fireEvent.change(screen.getByPlaceholderText('Article title'), {
      target: { value: 'Changed Title' },
    });

    // Verify dirty state is detected
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
  });

  it('should re-enable navigation guard when Publish Settings save fails', async () => {
    const mockOnSaveDraft = vi.fn().mockResolvedValue({ error: 'Save failed' });

    render(<ArticleForm onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />);

    // Make the form dirty
    fireEvent.change(screen.getByPlaceholderText('Article title'), {
      target: { value: 'Dirty Title' },
    });

    // Click Publish Settings (will fail)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Publish Settings' }));
    });

    // Error should be displayed
    expect(screen.getByText('Save failed')).toBeInTheDocument();

    // After error, navigation guard should be re-enabled (isNavigatingToPublish reset to false)
    const callsAfterError = mockUseNavigationGuard.mock.calls;
    const lastCallAfterError = callsAfterError[callsAfterError.length - 1];
    expect(lastCallAfterError[0]).toEqual({ enabled: true });
  });

  it('should redirect with window.location.replace after successful Save Draft for new articles', async () => {
    const mockOnSaveDraft = vi.fn().mockResolvedValue({ success: true, id: 'draft-id' });

    render(<ArticleForm onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />);

    // Make the form dirty
    fireEvent.change(screen.getByPlaceholderText('Article title'), {
      target: { value: 'Dirty Title' },
    });

    // Click Save Draft (not Publish Settings)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
    });

    // After successful save of a new article, window.location.replace is used
    // to bypass the client-side navigation guard entirely.
    expect(window.location.replace).toHaveBeenCalledWith('/admin/articles/draft-id/edit');
  });

  it('should disable navigation guard for markdown Publish Settings navigation', async () => {
    const mockOnSaveDraft = vi.fn().mockResolvedValue({ success: true, id: 'md-pub-id' });

    render(
      <ArticleForm contentFormat="markdown" onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />
    );

    // Make the form dirty
    fireEvent.change(screen.getByTestId('markdown-editor'), {
      target: { value: '# Dirty Content' },
    });

    // Before clicking Publish Settings, isDirty should be true
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

    expect(mockPush).toHaveBeenCalledWith('/admin/articles/md-pub-id/publish');
  });

  // --- Markdown mode: all fields combined ---

  it('should submit all fields including metadata in markdown mode', async () => {
    const mockOnSaveDraft = vi.fn().mockResolvedValue({ success: true, id: 'full-md-id' });

    render(
      <ArticleForm
        contentFormat="markdown"
        categories={[{ id: 'cat-2', name: 'Strategy' }]}
        onSaveDraft={mockOnSaveDraft}
        labels={defaultLabels}
      />
    );

    fireEvent.change(screen.getByLabelText('Slug'), { target: { value: 'md-test' } });
    fireEvent.change(screen.getByPlaceholderText('Article title'), {
      target: { value: 'MD Full Test' },
    });
    fireEvent.change(screen.getByTestId('markdown-editor'), {
      target: { value: '# Full markdown' },
    });

    openMetadataPanel();
    fireEvent.change(screen.getByLabelText('Excerpt'), { target: { value: 'MD excerpt' } });
    fireEvent.change(screen.getByLabelText('Description (SEO)'), {
      target: { value: 'MD description' },
    });
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'cat-2' } });
    fireEvent.change(screen.getByLabelText('Icon'), { target: { value: '!!' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
    });

    expect(mockOnSaveDraft).toHaveBeenCalledWith({
      slug: 'md-test',
      title: 'MD Full Test',
      content: '# Full markdown',
      contentJson: null,
      contentFormat: 'markdown',
      locale: 'en',
      excerpt: 'MD excerpt',
      description: 'MD description',
      categoryId: 'cat-2',
      icon: '!!',
    });
  });
});
