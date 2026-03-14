import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ArticleForm } from './ArticleForm';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
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
  preview: 'Preview',
  cancel: 'Cancel',
  backToList: 'Back to Articles',
};

describe('ArticleForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all form fields', () => {
    const mockOnSaveDraft = vi.fn();

    render(<ArticleForm onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />);

    expect(screen.getByLabelText('Slug')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Content')).toBeInTheDocument();
    expect(screen.getByLabelText('Locale')).toBeInTheDocument();
  });

  it('should render Save Draft, Preview, and Cancel buttons', () => {
    const mockOnSaveDraft = vi.fn();

    render(<ArticleForm onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />);

    expect(screen.getByRole('button', { name: 'Save Draft' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preview' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('should not render Status, Visibility, Pinned At, or Published At fields', () => {
    const mockOnSaveDraft = vi.fn();

    render(<ArticleForm onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />);

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
    };

    render(
      <ArticleForm defaultValues={defaults} onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />
    );

    expect(screen.getByLabelText('Slug')).toHaveValue('my-slug');
    expect(screen.getByLabelText('Title')).toHaveValue('My Title');
    expect(screen.getByLabelText('Content')).toHaveValue('My Content');
    expect(screen.getByLabelText('Locale')).toHaveValue('ja');
  });

  it('should call onSaveDraft with form data and navigate to list on Save Draft', async () => {
    const mockOnSaveDraft = vi.fn().mockResolvedValue({ success: true, id: 'test-id' });

    render(<ArticleForm onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />);

    fireEvent.change(screen.getByLabelText('Slug'), { target: { value: 'test-slug' } });
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Test Title' } });
    fireEvent.change(screen.getByLabelText('Content'), { target: { value: 'Test Content' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
    });

    expect(mockOnSaveDraft).toHaveBeenCalledWith({
      slug: 'test-slug',
      title: 'Test Title',
      content: 'Test Content',
      locale: 'en',
    });
    expect(mockPush).toHaveBeenCalledWith('/admin/articles');
  });

  it('should call onSaveDraft and navigate to preview page on Preview', async () => {
    const mockOnSaveDraft = vi.fn().mockResolvedValue({ success: true, id: 'generated-id' });

    render(<ArticleForm onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />);

    fireEvent.change(screen.getByLabelText('Slug'), { target: { value: 'preview-slug' } });
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Preview Title' } });
    fireEvent.change(screen.getByLabelText('Content'), { target: { value: 'Preview Content' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    });

    expect(mockOnSaveDraft).toHaveBeenCalledWith({
      slug: 'preview-slug',
      title: 'Preview Title',
      content: 'Preview Content',
      locale: 'en',
    });
    expect(mockPush).toHaveBeenCalledWith('/admin/articles/generated-id/preview');
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

  it('should display error message when onSaveDraft returns an error on Preview', async () => {
    const mockOnSaveDraft = vi.fn().mockResolvedValue({ error: 'invalid title' });

    render(<ArticleForm onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
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

  it('should navigate to articles list on Back to Articles', () => {
    const mockOnSaveDraft = vi.fn();

    render(<ArticleForm onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />);

    fireEvent.click(screen.getByRole('button', { name: 'Back to Articles' }));

    expect(mockPush).toHaveBeenCalledWith('/admin/articles');
  });
});
