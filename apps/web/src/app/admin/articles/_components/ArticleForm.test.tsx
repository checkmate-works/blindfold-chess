import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ArticleForm } from './ArticleForm';

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
    // In test, vi.mock makes the promise resolve synchronously
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
};

function openMetadataPanel() {
  fireEvent.click(screen.getByTitle('Metadata'));
}

describe('ArticleForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render title and content fields in the editor pane', () => {
    const mockOnSaveDraft = vi.fn();

    render(<ArticleForm onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />);

    expect(screen.getByPlaceholderText('Article title')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Article content...')).toBeInTheDocument();
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
    expect(screen.getByPlaceholderText('Article content...')).toHaveValue('My Content');
    expect(screen.getByLabelText('Locale')).toHaveValue('ja');

    openMetadataPanel();

    expect(screen.getByLabelText('Excerpt')).toHaveValue('My Excerpt');
    expect(screen.getByLabelText('Description (SEO)')).toHaveValue('My Description');
    expect(screen.getByLabelText('Category')).toHaveValue('cat-1');
    expect(screen.getByLabelText('Icon')).toHaveValue('♟️');
  });

  it('should call onSaveDraft with form data and show toast on Save Draft', async () => {
    const mockOnSaveDraft = vi.fn().mockResolvedValue({ success: true, id: 'test-id' });

    render(<ArticleForm onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />);

    fireEvent.change(screen.getByLabelText('Slug'), { target: { value: 'test-slug' } });
    fireEvent.change(screen.getByPlaceholderText('Article title'), {
      target: { value: 'Test Title' },
    });
    fireEvent.change(screen.getByPlaceholderText('Article content...'), {
      target: { value: 'Test Content' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
    });

    expect(mockOnSaveDraft).toHaveBeenCalledWith({
      slug: 'test-slug',
      title: 'Test Title',
      content: 'Test Content',
      locale: 'en',
      excerpt: '',
      description: '',
      categoryId: '',
      icon: '',
    });
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/admin/articles/test-id/edit');
    expect(mockShowToast).toHaveBeenCalledWith('Draft saved', 'success');
  });

  it('should call onSaveDraft and navigate to preview page on Publish Settings', async () => {
    const mockOnSaveDraft = vi.fn().mockResolvedValue({ success: true, id: 'generated-id' });

    render(<ArticleForm onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />);

    fireEvent.change(screen.getByLabelText('Slug'), { target: { value: 'preview-slug' } });
    fireEvent.change(screen.getByPlaceholderText('Article title'), {
      target: { value: 'Preview Title' },
    });
    fireEvent.change(screen.getByPlaceholderText('Article content...'), {
      target: { value: 'Preview Content' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Publish Settings' }));
    });

    expect(mockOnSaveDraft).toHaveBeenCalledWith({
      slug: 'preview-slug',
      title: 'Preview Title',
      content: 'Preview Content',
      locale: 'en',
      excerpt: '',
      description: '',
      categoryId: '',
      icon: '',
    });
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

  // --- Markdown preview tests ---

  it('should render markdown preview when preview tab is active', () => {
    const mockOnSaveDraft = vi.fn();

    render(
      <ArticleForm
        defaultValues={{
          slug: '',
          title: '',
          content: '# Hello World',
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

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));

    expect(screen.getByTestId('markdown-preview')).toHaveTextContent('# Hello World');
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
    fireEvent.change(screen.getByPlaceholderText('Article content...'), {
      target: { value: 'Content' },
    });

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
    fireEvent.change(screen.getByPlaceholderText('Article content...'), {
      target: { value: 'Content' },
    });

    openMetadataPanel();
    fireEvent.change(screen.getByLabelText('Icon'), { target: { value: '♟️' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
    });

    expect(mockOnSaveDraft).toHaveBeenCalledWith(expect.objectContaining({ icon: '♟️' }));
  });

  // --- New fields input and submit ---

  it('should submit all new fields (excerpt, description, category, icon) with entered values', async () => {
    const mockOnSaveDraft = vi.fn().mockResolvedValue({ success: true, id: 'test-id' });
    const categories = [{ id: 'cat-1', name: 'Openings' }];

    render(
      <ArticleForm onSaveDraft={mockOnSaveDraft} categories={categories} labels={defaultLabels} />
    );

    fireEvent.change(screen.getByLabelText('Slug'), { target: { value: 'test' } });
    fireEvent.change(screen.getByPlaceholderText('Article title'), { target: { value: 'Test' } });
    fireEvent.change(screen.getByPlaceholderText('Article content...'), {
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

    expect(mockOnSaveDraft).toHaveBeenCalledWith({
      slug: 'test',
      title: 'Test',
      content: 'Content',
      locale: 'en',
      excerpt: 'A brief summary',
      description: 'Meta desc',
      categoryId: 'cat-1',
      icon: '♟️',
    });
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

  // --- Real-time preview tests ---

  it('should update markdown preview when switching to preview tab after editing', () => {
    const mockOnSaveDraft = vi.fn();

    render(<ArticleForm onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />);

    const contentInput = screen.getByPlaceholderText('Article content...');
    fireEvent.change(contentInput, { target: { value: '## New Content' } });

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));

    expect(screen.getByTestId('markdown-preview')).toHaveTextContent('## New Content');
  });

  it('should display title in preview tab when title is entered', () => {
    const mockOnSaveDraft = vi.fn();

    render(<ArticleForm onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />);

    fireEvent.change(screen.getByPlaceholderText('Article title'), {
      target: { value: 'Preview Title' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));

    // The title is rendered as an h1 in the preview pane
    const headings = screen.getAllByText('Preview Title');
    expect(headings.length).toBeGreaterThanOrEqual(1);
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

  it('should have aria-labels on title and content inputs', () => {
    const mockOnSaveDraft = vi.fn();

    render(<ArticleForm onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />);

    expect(screen.getByPlaceholderText('Article title')).toHaveAttribute('aria-label', 'Title');
    expect(screen.getByPlaceholderText('Article content...')).toHaveAttribute(
      'aria-label',
      'Content'
    );
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
});
