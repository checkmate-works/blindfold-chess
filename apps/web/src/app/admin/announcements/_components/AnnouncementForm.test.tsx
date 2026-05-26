import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AnnouncementForm } from './AnnouncementForm';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

const defaultLabels = {
  formTitle: 'Create Announcement',
  slug: 'Slug',
  slugPlaceholder: 'e.g. new-feature-release',
  title: 'Title',
  titlePlaceholder: 'Announcement title',
  content: 'Content',
  contentPlaceholder: 'Announcement content...',
  locale: 'Locale',
  saveDraft: 'Save Draft',
  savingDraft: 'Saving...',
  preview: 'Preview',
  cancel: 'Cancel',
  backToList: 'Back to Announcements',
};

describe('AnnouncementForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all form fields', () => {
    const mockOnSaveDraft = vi.fn();

    render(<AnnouncementForm onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />);

    expect(screen.getByLabelText('Slug')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Content')).toBeInTheDocument();
    expect(screen.getByLabelText('Locale')).toBeInTheDocument();
  });

  it('should render Save Draft, Preview, and Cancel buttons', () => {
    const mockOnSaveDraft = vi.fn();

    render(<AnnouncementForm onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />);

    expect(screen.getByRole('button', { name: 'Save Draft' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preview' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('should not render Status, Visibility, Pinned At, or Published At fields', () => {
    const mockOnSaveDraft = vi.fn();

    render(<AnnouncementForm onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />);

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
      <AnnouncementForm
        defaultValues={defaults}
        onSaveDraft={mockOnSaveDraft}
        labels={defaultLabels}
      />
    );

    expect(screen.getByLabelText('Slug')).toHaveValue('my-slug');
    expect(screen.getByLabelText('Title')).toHaveValue('My Title');
    expect(screen.getByLabelText('Content')).toHaveValue('My Content');
    expect(screen.getByLabelText('Locale')).toHaveValue('ja');
  });

  it('should call onSaveDraft with form data and navigate to list on Save Draft', async () => {
    const mockOnSaveDraft = vi.fn().mockResolvedValue({ success: true, id: 'test-id' });

    render(<AnnouncementForm onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />);

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
    expect(mockPush).toHaveBeenCalledWith('/admin/announcements');
  });

  it('should call onSaveDraft and navigate to preview page on Preview', async () => {
    const mockOnSaveDraft = vi.fn().mockResolvedValue({ success: true, id: 'generated-id' });

    render(<AnnouncementForm onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />);

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
    expect(mockPush).toHaveBeenCalledWith('/admin/announcements/generated-id/preview');
  });

  it('should display error message when onSaveDraft returns an error on Save Draft', async () => {
    const mockOnSaveDraft = vi.fn().mockResolvedValue({ error: 'invalid slug' });

    render(<AnnouncementForm onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
    });

    expect(screen.getByText('invalid slug')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should display error message when onSaveDraft returns an error on Preview', async () => {
    const mockOnSaveDraft = vi.fn().mockResolvedValue({ error: 'invalid title' });

    render(<AnnouncementForm onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    });

    expect(screen.getByText('invalid title')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should navigate to announcements list on Cancel', () => {
    const mockOnSaveDraft = vi.fn();

    render(<AnnouncementForm onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(mockPush).toHaveBeenCalledWith('/admin/announcements');
    expect(mockOnSaveDraft).not.toHaveBeenCalled();
  });

  it('should navigate to announcements list on Back to Announcements', () => {
    const mockOnSaveDraft = vi.fn();

    render(<AnnouncementForm onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />);

    fireEvent.click(screen.getByRole('button', { name: 'Back to Announcements' }));

    expect(mockPush).toHaveBeenCalledWith('/admin/announcements');
  });

  it('should render Locale field between Slug and Title', () => {
    const mockOnSaveDraft = vi.fn();

    const { container } = render(
      <AnnouncementForm onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />
    );

    const fields = Array.from(container.querySelectorAll('label')).map((l) => l.textContent);
    const slugIdx = fields.indexOf('Slug');
    const localeIdx = fields.indexOf('Locale');
    const titleIdx = fields.indexOf('Title');

    expect(slugIdx).toBeGreaterThanOrEqual(0);
    expect(localeIdx).toBe(slugIdx + 1);
    expect(titleIdx).toBe(localeIdx + 1);
  });

  it('should mark Slug input readOnly when lockSlug is true', () => {
    const mockOnSaveDraft = vi.fn();

    render(<AnnouncementForm onSaveDraft={mockOnSaveDraft} labels={defaultLabels} lockSlug />);

    expect(screen.getByLabelText('Slug')).toHaveAttribute('readonly');
  });

  it('should disable Locale select when lockLocale is true', () => {
    const mockOnSaveDraft = vi.fn();

    render(<AnnouncementForm onSaveDraft={mockOnSaveDraft} labels={defaultLabels} lockLocale />);

    expect(screen.getByLabelText('Locale')).toBeDisabled();
  });

  it('should leave Slug editable and Locale enabled by default', () => {
    const mockOnSaveDraft = vi.fn();

    render(<AnnouncementForm onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />);

    expect(screen.getByLabelText('Slug')).not.toHaveAttribute('readonly');
    expect(screen.getByLabelText('Locale')).not.toBeDisabled();
  });

  it('should still submit locked values via onSaveDraft', async () => {
    const mockOnSaveDraft = vi.fn().mockResolvedValue({ success: true, id: 'variant-id' });

    render(
      <AnnouncementForm
        defaultValues={{
          slug: 'ad-free-reward-for-posting',
          title: '',
          content: '',
          locale: 'pt-BR',
        }}
        lockSlug
        lockLocale
        onSaveDraft={mockOnSaveDraft}
        labels={defaultLabels}
      />
    );

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Variant Title' } });
    fireEvent.change(screen.getByLabelText('Content'), { target: { value: 'Variant Content' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
    });

    expect(mockOnSaveDraft).toHaveBeenCalledWith({
      slug: 'ad-free-reward-for-posting',
      title: 'Variant Title',
      content: 'Variant Content',
      locale: 'pt-BR',
    });
  });
});
