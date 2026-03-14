import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AnnouncementPreviewForm } from './AnnouncementPreviewForm';

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

const testId = 'ann-00000000-0000-0000-0000-000000000001';

const defaultLabels = {
  status: 'Status',
  visibility: 'Visibility',
  pinnedAt: 'Pinned At',
  publishedAt: 'Published At',
  save: 'Save',
  saving: 'Saving...',
  backToEdit: 'Back to Edit',
  draft: 'Draft',
  published: 'Published',
  public: 'Public',
  members: 'Members',
};

const defaultValues = {
  status: 'draft',
  visibility: 'public',
  pinnedAt: '',
  publishedAt: '',
};

const announcementData = {
  slug: 'test-announcement',
  title: 'Test Announcement',
  content: '# Hello\nThis is a test.',
  locale: 'en',
};

describe('AnnouncementPreviewForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render Status and Visibility as radio buttons', () => {
    render(
      <AnnouncementPreviewForm
        id={testId}
        announcementData={announcementData}
        defaultValues={defaultValues}
        labels={defaultLabels}
      />
    );

    expect(screen.getByRole('radio', { name: 'Draft' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Published' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Public' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Members' })).toBeInTheDocument();
  });

  it('should render Pinned At field', () => {
    render(
      <AnnouncementPreviewForm
        id={testId}
        announcementData={announcementData}
        defaultValues={defaultValues}
        labels={defaultLabels}
      />
    );

    expect(screen.getByLabelText('Pinned At')).toBeInTheDocument();
  });

  it('should not show Published At when status is draft', () => {
    render(
      <AnnouncementPreviewForm
        id={testId}
        announcementData={announcementData}
        defaultValues={defaultValues}
        labels={defaultLabels}
      />
    );

    expect(screen.queryByLabelText('Published At')).not.toBeInTheDocument();
  });

  it('should show Published At when status is published', () => {
    render(
      <AnnouncementPreviewForm
        id={testId}
        announcementData={announcementData}
        defaultValues={{ ...defaultValues, status: 'published', publishedAt: '2024-06-15T14:00' }}
        labels={defaultLabels}
      />
    );

    expect(screen.getByLabelText('Published At')).toBeInTheDocument();
    expect(screen.getByLabelText('Published At')).toHaveValue('2024-06-15T14:00');
  });

  it('should show Published At when switching status from draft to published', () => {
    render(
      <AnnouncementPreviewForm
        id={testId}
        announcementData={announcementData}
        defaultValues={defaultValues}
        labels={defaultLabels}
      />
    );

    expect(screen.queryByLabelText('Published At')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: 'Published' }));

    expect(screen.getByLabelText('Published At')).toBeInTheDocument();
  });

  it('should render Save and Back to Edit buttons', () => {
    render(
      <AnnouncementPreviewForm
        id={testId}
        announcementData={announcementData}
        defaultValues={defaultValues}
        labels={defaultLabels}
      />
    );

    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to Edit' })).toBeInTheDocument();
  });

  it('should populate form with default values', () => {
    const values = {
      status: 'published',
      visibility: 'members_only',
      pinnedAt: '2024-06-15T12:00',
      publishedAt: '2024-06-15T14:00',
    };

    render(
      <AnnouncementPreviewForm
        id={testId}
        announcementData={announcementData}
        defaultValues={values}
        labels={defaultLabels}
      />
    );

    expect(screen.getByRole('radio', { name: 'Published' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Members' })).toBeChecked();
    expect(screen.getByLabelText('Pinned At')).toHaveValue('2024-06-15T12:00');
    expect(screen.getByLabelText('Published At')).toHaveValue('2024-06-15T14:00');
  });

  it('should call updateAnnouncement with form data and navigate to list on Save', async () => {
    mockUpdateAnnouncement.mockResolvedValue({ success: true, id: testId });

    render(
      <AnnouncementPreviewForm
        id={testId}
        announcementData={announcementData}
        defaultValues={defaultValues}
        labels={defaultLabels}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });

    expect(mockUpdateAnnouncement).toHaveBeenCalledWith(testId, {
      ...announcementData,
      status: 'draft',
      visibility: 'public',
      pinnedAt: null,
      publishedAt: null,
    });
    expect(mockPush).toHaveBeenCalledWith('/admin/announcements');
  });

  it('should submit changed status and visibility values', async () => {
    mockUpdateAnnouncement.mockResolvedValue({ success: true, id: testId });

    render(
      <AnnouncementPreviewForm
        id={testId}
        announcementData={announcementData}
        defaultValues={defaultValues}
        labels={defaultLabels}
      />
    );

    fireEvent.click(screen.getByRole('radio', { name: 'Published' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Members' }));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });

    expect(mockUpdateAnnouncement).toHaveBeenCalledWith(testId, {
      ...announcementData,
      status: 'published',
      visibility: 'members_only',
      pinnedAt: null,
      publishedAt: null,
    });
  });

  it('should display error message when updateAnnouncement returns an error', async () => {
    mockUpdateAnnouncement.mockResolvedValue({
      error: 'Published date is required when status is published',
    });

    render(
      <AnnouncementPreviewForm
        id={testId}
        announcementData={announcementData}
        defaultValues={defaultValues}
        labels={defaultLabels}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });

    expect(
      screen.getByText('Published date is required when status is published')
    ).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should navigate to edit page on Back to Edit', () => {
    render(
      <AnnouncementPreviewForm
        id={testId}
        announcementData={announcementData}
        defaultValues={defaultValues}
        labels={defaultLabels}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Back to Edit' }));

    expect(mockPush).toHaveBeenCalledWith(`/admin/announcements/${testId}/edit`);
    expect(mockUpdateAnnouncement).not.toHaveBeenCalled();
  });

  it('should convert empty pinnedAt and publishedAt to null on submit', async () => {
    mockUpdateAnnouncement.mockResolvedValue({ success: true, id: testId });

    render(
      <AnnouncementPreviewForm
        id={testId}
        announcementData={announcementData}
        defaultValues={{ ...defaultValues, pinnedAt: '', publishedAt: '' }}
        labels={defaultLabels}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });

    expect(mockUpdateAnnouncement).toHaveBeenCalledWith(
      testId,
      expect.objectContaining({
        pinnedAt: null,
        publishedAt: null,
      })
    );
  });
});
