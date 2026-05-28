import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EditAnnouncementForm } from './EditAnnouncementForm';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

const mockUpdateAnnouncement = vi.fn();

vi.mock('../_actions/updateAnnouncement', () => ({
  updateAnnouncement: (...args: unknown[]) => mockUpdateAnnouncement(...args),
}));

vi.mock('next-navigation-guard', () => ({
  useNavigationGuard: () => ({ active: false, accept: vi.fn(), reject: vi.fn() }),
}));

const mockShowToast = vi.fn();

vi.mock('@/app/[locale]/_contexts/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

const testId = 'ann-00000000-0000-0000-0000-000000000001';

const defaultLabels = {
  formTitle: 'Edit Announcement',
  slug: 'Slug',
  slugPlaceholder: 'e.g. new-feature-release',
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

const defaultValues = {
  slug: 'existing-slug',
  title: 'Existing Title',
  content: 'Existing Content',
  locale: 'en',
  status: 'published',
  visibility: 'members_only',
  showAsBanner: true,
  pinnedAt: '2024-06-15T12:00',
  publishedAt: '2024-06-15T14:00',
};

const draftDefaultValues = {
  slug: 'draft-slug',
  title: 'Draft Title',
  content: 'Draft Content',
  locale: 'en',
  status: 'draft',
  visibility: 'public',
  showAsBanner: false,
  pinnedAt: null,
  publishedAt: null,
};

describe('EditAnnouncementForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should open the confirm modal on Save for a published announcement and not call updateAnnouncement yet', async () => {
    mockUpdateAnnouncement.mockResolvedValue({ success: true, id: testId });

    render(
      <EditAnnouncementForm id={testId} defaultValues={defaultValues} labels={defaultLabels} />
    );

    // For a published announcement the top-bar button reads 'Save' (savePublished).
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });

    expect(screen.getByText('Confirm Save')).toBeInTheDocument();
    expect(mockUpdateAnnouncement).not.toHaveBeenCalled();
  });

  it('should call updateAnnouncement with status=published preserved after confirming the modal', async () => {
    mockUpdateAnnouncement.mockResolvedValue({ success: true, id: testId });

    render(
      <EditAnnouncementForm id={testId} defaultValues={defaultValues} labels={defaultLabels} />
    );

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Updated Title' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });

    await act(async () => {
      // After modal opens, two 'Save' buttons exist; confirm is the second.
      const saveButtons = screen.getAllByRole('button', { name: 'Save' });
      fireEvent.click(saveButtons[saveButtons.length - 1]);
    });

    expect(mockUpdateAnnouncement).toHaveBeenCalledWith(testId, {
      slug: 'existing-slug',
      title: 'Updated Title',
      content: 'Existing Content',
      locale: 'en',
      status: 'published',
      visibility: 'members_only',
      showAsBanner: true,
      pinnedAt: '2024-06-15T12:00',
      publishedAt: '2024-06-15T14:00',
    });
  });

  it('should call updateAnnouncement with status=published on Preview and navigate to preview page', async () => {
    mockUpdateAnnouncement.mockResolvedValue({ success: true, id: testId });

    render(
      <EditAnnouncementForm id={testId} defaultValues={defaultValues} labels={defaultLabels} />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    });

    expect(mockUpdateAnnouncement).toHaveBeenCalledWith(testId, {
      slug: 'existing-slug',
      title: 'Existing Title',
      content: 'Existing Content',
      locale: 'en',
      status: 'published',
      visibility: 'members_only',
      showAsBanner: true,
      pinnedAt: '2024-06-15T12:00',
      publishedAt: '2024-06-15T14:00',
    });
    expect(mockPush).toHaveBeenCalledWith(`/admin/announcements/${testId}/preview`);
  });

  it('should call updateAnnouncement with status=draft directly (no modal) on a draft announcement', async () => {
    mockUpdateAnnouncement.mockResolvedValue({ success: true, id: testId });

    render(
      <EditAnnouncementForm id={testId} defaultValues={draftDefaultValues} labels={defaultLabels} />
    );

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Updated Draft' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
    });

    expect(screen.queryByText('Confirm Save')).not.toBeInTheDocument();
    expect(mockUpdateAnnouncement).toHaveBeenCalledWith(testId, {
      slug: 'draft-slug',
      title: 'Updated Draft',
      content: 'Draft Content',
      locale: 'en',
      status: 'draft',
      visibility: 'public',
      showAsBanner: false,
      pinnedAt: null,
      publishedAt: null,
    });
  });
});
