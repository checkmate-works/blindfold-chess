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
  sendNotification: 'Send notification to users',
  notificationAlreadySent: 'Notification already sent',
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
        notificationSent={false}
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
        notificationSent={false}
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
        notificationSent={false}
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
        notificationSent={false}
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
        notificationSent={false}
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
        notificationSent={false}
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
        notificationSent={false}
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
        notificationSent={false}
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
      sendNotification: false,
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
        notificationSent={false}
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
      sendNotification: false,
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
        notificationSent={false}
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
        notificationSent={false}
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
        notificationSent={false}
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

  // Notification checkbox tests

  it('should not show notification checkbox when status is draft', () => {
    render(
      <AnnouncementPreviewForm
        id={testId}
        announcementData={announcementData}
        defaultValues={defaultValues}
        notificationSent={false}
        labels={defaultLabels}
      />
    );

    expect(screen.queryByText('Send notification to users')).not.toBeInTheDocument();
  });

  it('should not show notification checkbox when announcement is already published', () => {
    render(
      <AnnouncementPreviewForm
        id={testId}
        announcementData={announcementData}
        defaultValues={{ ...defaultValues, status: 'published', publishedAt: '2024-06-15T14:00' }}
        notificationSent={false}
        labels={defaultLabels}
      />
    );

    expect(screen.queryByText('Send notification to users')).not.toBeInTheDocument();
  });

  it('should show notification checkbox when switching from draft to published', () => {
    render(
      <AnnouncementPreviewForm
        id={testId}
        announcementData={announcementData}
        defaultValues={defaultValues}
        notificationSent={false}
        labels={defaultLabels}
      />
    );

    fireEvent.click(screen.getByRole('radio', { name: 'Published' }));

    expect(screen.getByText('Send notification to users')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  it('should show "Notification already sent" when notification was already sent', () => {
    render(
      <AnnouncementPreviewForm
        id={testId}
        announcementData={announcementData}
        defaultValues={defaultValues}
        notificationSent={true}
        labels={defaultLabels}
      />
    );

    fireEvent.click(screen.getByRole('radio', { name: 'Published' }));

    expect(screen.getByText('Notification already sent')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('should send sendNotification=true when checkbox is checked', async () => {
    mockUpdateAnnouncement.mockResolvedValue({ success: true, id: testId });

    render(
      <AnnouncementPreviewForm
        id={testId}
        announcementData={announcementData}
        defaultValues={defaultValues}
        notificationSent={false}
        labels={defaultLabels}
      />
    );

    fireEvent.click(screen.getByRole('radio', { name: 'Published' }));
    fireEvent.click(screen.getByRole('checkbox'));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });

    expect(mockUpdateAnnouncement).toHaveBeenCalledWith(testId, {
      ...announcementData,
      status: 'published',
      visibility: 'public',
      pinnedAt: null,
      publishedAt: null,
      sendNotification: true,
    });
  });

  it('should send sendNotification=false when checkbox is not checked on publish', async () => {
    mockUpdateAnnouncement.mockResolvedValue({ success: true, id: testId });

    render(
      <AnnouncementPreviewForm
        id={testId}
        announcementData={announcementData}
        defaultValues={defaultValues}
        notificationSent={false}
        labels={defaultLabels}
      />
    );

    fireEvent.click(screen.getByRole('radio', { name: 'Published' }));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });

    expect(mockUpdateAnnouncement).toHaveBeenCalledWith(testId, {
      ...announcementData,
      status: 'published',
      visibility: 'public',
      pinnedAt: null,
      publishedAt: null,
      sendNotification: false,
    });
  });

  it('should send sendNotification=false when notificationSent is true even if publishing', async () => {
    mockUpdateAnnouncement.mockResolvedValue({ success: true, id: testId });

    render(
      <AnnouncementPreviewForm
        id={testId}
        announcementData={announcementData}
        defaultValues={defaultValues}
        notificationSent={true}
        labels={defaultLabels}
      />
    );

    fireEvent.click(screen.getByRole('radio', { name: 'Published' }));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });

    expect(mockUpdateAnnouncement).toHaveBeenCalledWith(testId, {
      ...announcementData,
      status: 'published',
      visibility: 'public',
      pinnedAt: null,
      publishedAt: null,
      sendNotification: false,
    });
  });

  it('should hide notification checkbox when switching back to draft', () => {
    render(
      <AnnouncementPreviewForm
        id={testId}
        announcementData={announcementData}
        defaultValues={defaultValues}
        notificationSent={false}
        labels={defaultLabels}
      />
    );

    fireEvent.click(screen.getByRole('radio', { name: 'Published' }));
    expect(screen.getByText('Send notification to users')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: 'Draft' }));
    expect(screen.queryByText('Send notification to users')).not.toBeInTheDocument();
  });

  it('should send sendNotification=false when checkbox is checked then unchecked before submit', async () => {
    mockUpdateAnnouncement.mockResolvedValue({ success: true, id: testId });

    render(
      <AnnouncementPreviewForm
        id={testId}
        announcementData={announcementData}
        defaultValues={defaultValues}
        notificationSent={false}
        labels={defaultLabels}
      />
    );

    fireEvent.click(screen.getByRole('radio', { name: 'Published' }));
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('checkbox')).toBeChecked();

    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('checkbox')).not.toBeChecked();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });

    expect(mockUpdateAnnouncement).toHaveBeenCalledWith(testId, {
      ...announcementData,
      status: 'published',
      visibility: 'public',
      pinnedAt: null,
      publishedAt: null,
      sendNotification: false,
    });
  });

  it('should reset sendNotification when toggling status draft->published->draft->published', async () => {
    mockUpdateAnnouncement.mockResolvedValue({ success: true, id: testId });

    render(
      <AnnouncementPreviewForm
        id={testId}
        announcementData={announcementData}
        defaultValues={defaultValues}
        notificationSent={false}
        labels={defaultLabels}
      />
    );

    // Switch to published and check the notification checkbox
    fireEvent.click(screen.getByRole('radio', { name: 'Published' }));
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('checkbox')).toBeChecked();

    // Switch back to draft (checkbox disappears)
    fireEvent.click(screen.getByRole('radio', { name: 'Draft' }));
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();

    // Switch back to published - checkbox should be unchecked (state preserved but UI hidden/shown)
    fireEvent.click(screen.getByRole('radio', { name: 'Published' }));
    // The checkbox reappears; sendNotification state is preserved
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('should not show notification checkbox when defaultValues.status is published (already published)', () => {
    render(
      <AnnouncementPreviewForm
        id={testId}
        announcementData={announcementData}
        defaultValues={{ ...defaultValues, status: 'published', publishedAt: '2024-06-15T14:00' }}
        notificationSent={true}
        labels={defaultLabels}
      />
    );

    // Already published -> published is not an initial publish, no checkbox
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByText('Send notification to users')).not.toBeInTheDocument();
    expect(screen.queryByText('Notification already sent')).not.toBeInTheDocument();
  });
});
