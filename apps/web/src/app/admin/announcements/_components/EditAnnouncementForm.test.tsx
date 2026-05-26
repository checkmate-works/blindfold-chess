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
  preview: 'Preview',
  cancel: 'Cancel',
  backToList: 'Back to Announcements',
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
  visibility: 'members_only',
  pinnedAt: '2024-06-15T12:00',
  publishedAt: '2024-06-15T14:00',
};

describe('EditAnnouncementForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call updateAnnouncement with status draft and preserved publish settings on Save Draft', async () => {
    mockUpdateAnnouncement.mockResolvedValue({ success: true, id: testId });

    render(
      <EditAnnouncementForm id={testId} defaultValues={defaultValues} labels={defaultLabels} />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
    });

    expect(mockUpdateAnnouncement).toHaveBeenCalledWith(testId, {
      slug: 'existing-slug',
      title: 'Existing Title',
      content: 'Existing Content',
      locale: 'en',
      status: 'draft',
      visibility: 'members_only',
      pinnedAt: '2024-06-15T12:00',
      publishedAt: '2024-06-15T14:00',
    });
  });

  it('should call updateAnnouncement with status draft on Preview and navigate to preview page', async () => {
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
      status: 'draft',
      visibility: 'members_only',
      pinnedAt: '2024-06-15T12:00',
      publishedAt: '2024-06-15T14:00',
    });
    expect(mockPush).toHaveBeenCalledWith(`/admin/announcements/${testId}/preview`);
  });

  it('should pass edited content fields to updateAnnouncement with draft status', async () => {
    mockUpdateAnnouncement.mockResolvedValue({ success: true, id: testId });

    render(
      <EditAnnouncementForm id={testId} defaultValues={defaultValues} labels={defaultLabels} />
    );

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Updated Title' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
    });

    expect(mockUpdateAnnouncement).toHaveBeenCalledWith(testId, {
      slug: 'existing-slug',
      title: 'Updated Title',
      content: 'Existing Content',
      locale: 'en',
      status: 'draft',
      visibility: 'members_only',
      pinnedAt: '2024-06-15T12:00',
      publishedAt: '2024-06-15T14:00',
    });
  });
});
