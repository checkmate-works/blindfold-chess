import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AnnouncementForm } from './AnnouncementForm';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
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

const mockShowToast = vi.fn();

vi.mock('@/app/[locale]/_contexts/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

const mockLocationReplace = vi.fn();
const originalLocation = window.location;

beforeEach(() => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...originalLocation, replace: mockLocationReplace },
  });
});

const defaultLabels = {
  formTitle: 'Create Announcement',
  slug: 'Slug',
  slugPlaceholder: 'e.g. new-feature-release',
  generateSlugFromTitle: 'Generate from title',
  title: 'Title',
  titlePlaceholder: 'Announcement title',
  content: 'Content',
  contentPlaceholder: 'Announcement content...',
  locale: 'Locale',
  saveDraft: 'Save Draft',
  savingDraft: 'Saving...',
  savePublished: 'Save',
  savingPublished: 'Saving...',
  preview: 'Preview',
  cancel: 'Cancel',
  unsavedChangesTitle: 'Unsaved Changes',
  unsavedChangesMessage: 'You have unsaved changes. Are you sure you want to leave?',
  unsavedChangesConfirm: 'Leave',
  unsavedChangesCancel: 'Stay',
  draftSaved: 'Draft saved',
  publishedSaved: 'Announcement saved',
  publishedConfirmTitle: 'Confirm Save',
  publishedConfirmMessage:
    'This announcement is published. Your changes will be reflected immediately. Are you sure?',
  publishedConfirmConfirm: 'Save',
  publishedConfirmCancel: 'Cancel',
};

describe('AnnouncementForm', () => {
  beforeEach(() => {
    mockUseNavigationGuard.mockReturnValue({
      active: false,
      accept: vi.fn(),
      reject: vi.fn(),
    });
  });

  it('should render all form fields', () => {
    const mockOnSaveDraft = vi.fn();

    render(<AnnouncementForm onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />);

    expect(screen.getByLabelText('Slug')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Content')).toBeInTheDocument();
    expect(screen.getByLabelText('Locale')).toBeInTheDocument();
  });

  it('should fill the slug from the title when "Generate from title" is clicked', () => {
    render(<AnnouncementForm onSaveDraft={vi.fn()} labels={defaultLabels} />);

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'New Feature Release' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generate from title' }));

    expect(screen.getByLabelText('Slug')).toHaveValue('new-feature-release');
  });

  it('should keep "Generate from title" disabled when the title derives to no slug', () => {
    render(<AnnouncementForm onSaveDraft={vi.fn()} labels={defaultLabels} />);

    const button = screen.getByRole('button', { name: 'Generate from title' });
    expect(button).toBeDisabled();

    // A Japanese title has nothing to derive from — the button must stay
    // disabled rather than wipe a slug the admin typed by hand.
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: '新機能のお知らせ' } });
    expect(button).toBeDisabled();
  });

  it('should hide "Generate from title" when the slug is locked', () => {
    render(
      <AnnouncementForm onSaveDraft={vi.fn()} labels={defaultLabels} defaultSlug="fixed" lockSlug />
    );

    expect(screen.queryByRole('button', { name: 'Generate from title' })).not.toBeInTheDocument();
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

  it('should call onSaveDraft with form data and redirect to /edit on first save (new)', async () => {
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
    expect(mockLocationReplace).toHaveBeenCalledWith('/admin/announcements/test-id/edit');
    expect(mockPush).not.toHaveBeenCalled();
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

  it('should render Slug, Locale, Title, Content in that document order', () => {
    const mockOnSaveDraft = vi.fn();

    render(<AnnouncementForm onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />);

    const slugEl = screen.getByLabelText('Slug');
    const localeEl = screen.getByLabelText('Locale');
    const titleEl = screen.getByLabelText('Title');
    const contentEl = screen.getByLabelText('Content');

    expect(
      slugEl.compareDocumentPosition(localeEl) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      localeEl.compareDocumentPosition(titleEl) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      titleEl.compareDocumentPosition(contentEl) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('should render Slug and Locale inside the same horizontal row', () => {
    const mockOnSaveDraft = vi.fn();

    render(<AnnouncementForm onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />);

    const slugEl = screen.getByLabelText('Slug');
    const localeEl = screen.getByLabelText('Locale');

    expect(slugEl.parentElement).toBe(localeEl.parentElement);
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
        defaultSlug="ad-free-reward-for-posting"
        defaultLocale="pt-BR"
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

  // --- Unsaved-changes navigation guard ---

  it('should not enable the navigation guard on initial render', () => {
    const mockOnSaveDraft = vi.fn();

    render(<AnnouncementForm onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />);

    expect(mockUseNavigationGuard).toHaveBeenLastCalledWith({ enabled: false });
  });

  it('should enable the navigation guard after the user edits the title', () => {
    const mockOnSaveDraft = vi.fn();

    render(<AnnouncementForm onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />);

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Dirty Title' } });

    expect(mockUseNavigationGuard).toHaveBeenLastCalledWith({ enabled: true });
  });

  it('should not enable the navigation guard when state matches defaults', () => {
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

    expect(mockUseNavigationGuard).toHaveBeenLastCalledWith({ enabled: false });
  });

  it('should not render the dialog while the guard is inactive', () => {
    const mockOnSaveDraft = vi.fn();

    render(<AnnouncementForm onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />);

    expect(screen.queryByText('Unsaved Changes')).not.toBeInTheDocument();
  });

  it('should render the dialog while the guard is active', () => {
    const mockOnSaveDraft = vi.fn();
    const accept = vi.fn();
    const reject = vi.fn();
    mockUseNavigationGuard.mockReturnValue({ active: true, accept, reject });

    render(<AnnouncementForm onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />);

    expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
    expect(
      screen.getByText('You have unsaved changes. Are you sure you want to leave?')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Leave' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stay' })).toBeInTheDocument();
  });

  it('should disable the navigation guard after a successful Save Draft', async () => {
    const mockOnSaveDraft = vi.fn().mockResolvedValue({ success: true, id: 'saved-id' });

    render(<AnnouncementForm onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />);

    fireEvent.change(screen.getByLabelText('Slug'), { target: { value: 'new-slug' } });
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'New Title' } });
    fireEvent.change(screen.getByLabelText('Content'), { target: { value: 'New Content' } });

    expect(mockUseNavigationGuard).toHaveBeenLastCalledWith({ enabled: true });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
    });

    expect(mockUseNavigationGuard).toHaveBeenLastCalledWith({ enabled: false });
  });

  it('should disable the navigation guard before Preview saves so the post-save router.push is not intercepted', async () => {
    let resolveSave: (value: { success: true; id: string }) => void = () => {};
    const mockOnSaveDraft = vi.fn(
      () =>
        new Promise<{ success: true; id: string }>((resolve) => {
          resolveSave = resolve;
        })
    );

    render(<AnnouncementForm onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />);

    fireEvent.change(screen.getByLabelText('Slug'), { target: { value: 'preview-slug' } });
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Preview Title' } });
    fireEvent.change(screen.getByLabelText('Content'), { target: { value: 'Preview Content' } });

    expect(mockUseNavigationGuard).toHaveBeenLastCalledWith({ enabled: true });

    // Click Preview but do NOT resolve the save yet. The guard must already
    // be disabled by the time the save promise settles, so the subsequent
    // router.push is not intercepted.
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    });

    expect(mockUseNavigationGuard).toHaveBeenLastCalledWith({ enabled: false });

    await act(async () => {
      resolveSave({ success: true, id: 'preview-id' });
    });

    expect(mockPush).toHaveBeenCalledWith('/admin/announcements/preview-id/preview');
  });

  it('should re-enable the navigation guard when Preview save fails', async () => {
    const mockOnSaveDraft = vi.fn().mockResolvedValue({ error: 'invalid slug' });

    render(<AnnouncementForm onSaveDraft={mockOnSaveDraft} labels={defaultLabels} />);

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Preview Title' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    });

    expect(mockUseNavigationGuard).toHaveBeenLastCalledWith({ enabled: true });
  });

  // --- isPublished + PublishedConfirmModal flow ---

  it('should open the PublishedConfirmModal when saving a published announcement', async () => {
    const mockOnSaveDraft = vi.fn().mockResolvedValue({ success: true, id: 'pub-id' });
    const existingDefaults = {
      slug: 'existing-slug',
      title: 'Existing Title',
      content: 'Existing Content',
      locale: 'en',
    };

    render(
      <AnnouncementForm
        defaultValues={existingDefaults}
        isPublished
        onSaveDraft={mockOnSaveDraft}
        labels={defaultLabels}
      />
    );

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Edited Title' } });

    // Top bar's Save button (labels.savePublished === 'Save'). Only one 'Save'
    // button exists at this point — the modal hasn't opened yet.
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });

    expect(screen.getByText('Confirm Save')).toBeInTheDocument();
    expect(mockOnSaveDraft).not.toHaveBeenCalled();
  });

  it('should save after confirming the PublishedConfirmModal', async () => {
    const mockOnSaveDraft = vi.fn().mockResolvedValue({ success: true, id: 'pub-id' });
    const existingDefaults = {
      slug: 'existing-slug',
      title: 'Existing Title',
      content: 'Existing Content',
      locale: 'en',
    };

    render(
      <AnnouncementForm
        defaultValues={existingDefaults}
        isPublished
        onSaveDraft={mockOnSaveDraft}
        labels={defaultLabels}
      />
    );

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Edited Title' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });

    await act(async () => {
      // After the modal opens, two 'Save' buttons exist (top-bar + modal confirm).
      // The modal confirm is the second in DOM order.
      const saveButtons = screen.getAllByRole('button', { name: 'Save' });
      fireEvent.click(saveButtons[saveButtons.length - 1]);
    });

    expect(mockOnSaveDraft).toHaveBeenCalledWith({
      slug: 'existing-slug',
      title: 'Edited Title',
      content: 'Existing Content',
      locale: 'en',
    });
    expect(mockShowToast).toHaveBeenCalledWith('Announcement saved', 'success');
  });

  it('should close the PublishedConfirmModal on cancel without saving', async () => {
    const mockOnSaveDraft = vi.fn();
    const existingDefaults = {
      slug: 'existing-slug',
      title: 'Existing Title',
      content: 'Existing Content',
      locale: 'en',
    };

    render(
      <AnnouncementForm
        defaultValues={existingDefaults}
        isPublished
        onSaveDraft={mockOnSaveDraft}
        labels={defaultLabels}
      />
    );

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Edited Title' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });

    // Modal's Cancel button (second 'Cancel' — first is the top-bar Cancel)
    const cancelButtons = screen.getAllByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButtons[cancelButtons.length - 1]);

    expect(mockOnSaveDraft).not.toHaveBeenCalled();
    expect(screen.queryByText('Confirm Save')).not.toBeInTheDocument();
  });

  it('should save immediately (no modal) on a draft announcement', async () => {
    const mockOnSaveDraft = vi.fn().mockResolvedValue({ success: true, id: 'draft-id' });
    const existingDefaults = {
      slug: 'draft-slug',
      title: 'Draft Title',
      content: 'Draft Content',
      locale: 'en',
    };

    render(
      <AnnouncementForm
        defaultValues={existingDefaults}
        onSaveDraft={mockOnSaveDraft}
        labels={defaultLabels}
      />
    );

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Edited Draft' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
    });

    expect(mockOnSaveDraft).toHaveBeenCalled();
    expect(screen.queryByText('Confirm Save')).not.toBeInTheDocument();
    expect(mockShowToast).toHaveBeenCalledWith('Draft saved', 'success');
  });

  it('should not redirect when saving an existing announcement', async () => {
    const mockOnSaveDraft = vi.fn().mockResolvedValue({ success: true, id: 'existing-id' });
    const existingDefaults = {
      slug: 'existing-slug',
      title: 'Existing Title',
      content: 'Existing Content',
      locale: 'en',
    };

    render(
      <AnnouncementForm
        defaultValues={existingDefaults}
        onSaveDraft={mockOnSaveDraft}
        labels={defaultLabels}
      />
    );

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Edited Title' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
    });

    expect(mockLocationReplace).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
