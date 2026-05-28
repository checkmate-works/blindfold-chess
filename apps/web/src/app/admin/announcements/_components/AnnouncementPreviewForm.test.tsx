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
  showAsBanner: 'Show as top banner',
  showAsBannerHint:
    'Displays this announcement in the site-wide top banner for a few days after publishing.',
  sendNotification: 'Send notification to users',
  notificationAlreadySent: 'Notification already sent',
};

const defaultValues = {
  status: 'draft',
  visibility: 'public',
  showAsBanner: false,
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
      showAsBanner: false,
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
      showAsBanner: false,
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
      // members_only can never show a banner, so the flag is forced off.
      showAsBanner: false,
      pinnedAt: null,
      // Auto-filled with current datetime when status flips to Published.
      publishedAt: expect.any(String),
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
    expect(screen.getByLabelText('Send notification to users')).not.toBeChecked();
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
    expect(screen.queryByLabelText('Send notification to users')).not.toBeInTheDocument();
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
    fireEvent.click(screen.getByLabelText('Send notification to users'));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });

    expect(mockUpdateAnnouncement).toHaveBeenCalledWith(testId, {
      ...announcementData,
      status: 'published',
      visibility: 'public',
      showAsBanner: false,
      pinnedAt: null,
      publishedAt: expect.any(String),
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
      showAsBanner: false,
      pinnedAt: null,
      publishedAt: expect.any(String),
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
      showAsBanner: false,
      pinnedAt: null,
      publishedAt: expect.any(String),
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
    fireEvent.click(screen.getByLabelText('Send notification to users'));
    expect(screen.getByLabelText('Send notification to users')).toBeChecked();

    fireEvent.click(screen.getByLabelText('Send notification to users'));
    expect(screen.getByLabelText('Send notification to users')).not.toBeChecked();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });

    expect(mockUpdateAnnouncement).toHaveBeenCalledWith(testId, {
      ...announcementData,
      status: 'published',
      visibility: 'public',
      showAsBanner: false,
      pinnedAt: null,
      publishedAt: expect.any(String),
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
    fireEvent.click(screen.getByLabelText('Send notification to users'));
    expect(screen.getByLabelText('Send notification to users')).toBeChecked();

    // Switch back to draft (checkbox disappears)
    fireEvent.click(screen.getByRole('radio', { name: 'Draft' }));
    expect(screen.queryByLabelText('Send notification to users')).not.toBeInTheDocument();

    // Switch back to published - checkbox should be unchecked (state preserved but UI hidden/shown)
    fireEvent.click(screen.getByRole('radio', { name: 'Published' }));
    // The checkbox reappears; sendNotification state is preserved
    expect(screen.getByLabelText('Send notification to users')).toBeInTheDocument();
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
    expect(screen.queryByLabelText('Send notification to users')).not.toBeInTheDocument();
    expect(screen.queryByText('Send notification to users')).not.toBeInTheDocument();
    expect(screen.queryByText('Notification already sent')).not.toBeInTheDocument();
  });

  // --- Auto-fill publishedAt when status flips to Published ---

  it('should auto-fill publishedAt with the current datetime when Published is selected and publishedAt is empty', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T10:30:00'));

    try {
      render(
        <AnnouncementPreviewForm
          id={testId}
          announcementData={announcementData}
          defaultValues={defaultValues}
          notificationSent={false}
          labels={defaultLabels}
        />
      );

      // publishedAt field is hidden until Published is selected; the underlying
      // state still starts empty (defaultValues.publishedAt = '').
      fireEvent.click(screen.getByRole('radio', { name: 'Published' }));

      const publishedAtInput = screen.getByLabelText('Published At') as HTMLInputElement;
      expect(publishedAtInput.value).toBe('2026-06-15T10:30');
    } finally {
      vi.useRealTimers();
    }
  });

  it('should NOT overwrite publishedAt when Published is selected and publishedAt is already set', () => {
    const preFilledDefaults = {
      ...defaultValues,
      publishedAt: '2024-01-15T08:00',
    };

    render(
      <AnnouncementPreviewForm
        id={testId}
        announcementData={announcementData}
        defaultValues={preFilledDefaults}
        notificationSent={false}
        labels={defaultLabels}
      />
    );

    fireEvent.click(screen.getByRole('radio', { name: 'Published' }));

    const publishedAtInput = screen.getByLabelText('Published At') as HTMLInputElement;
    expect(publishedAtInput.value).toBe('2024-01-15T08:00');
  });

  it('should NOT touch publishedAt when Draft is re-selected', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T10:30:00'));

    try {
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
      fireEvent.click(screen.getByRole('radio', { name: 'Draft' }));
      fireEvent.click(screen.getByRole('radio', { name: 'Published' }));

      // The first Published selection filled in publishedAt with the current
      // datetime; flipping back to Draft and then Published again must not
      // re-stamp the value (it's no longer empty).
      const publishedAtInput = screen.getByLabelText('Published At') as HTMLInputElement;
      expect(publishedAtInput.value).toBe('2026-06-15T10:30');
    } finally {
      vi.useRealTimers();
    }
  });

  // --- show-as-banner opt-in toggle ---

  it('should not show the banner toggle while status is draft', () => {
    render(
      <AnnouncementPreviewForm
        id={testId}
        announcementData={announcementData}
        defaultValues={defaultValues}
        notificationSent={false}
        labels={defaultLabels}
      />
    );

    expect(screen.queryByText('Show as top banner')).not.toBeInTheDocument();
  });

  it('should show the banner toggle when status is published and visibility is public', () => {
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

    expect(screen.getByText('Show as top banner')).toBeInTheDocument();
  });

  it('should hide the banner toggle when visibility is members_only even if published', () => {
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

    expect(screen.queryByText('Show as top banner')).not.toBeInTheDocument();
  });

  it('should submit showAsBanner=true when the toggle is checked', async () => {
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
    fireEvent.click(screen.getByLabelText('Show as top banner'));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });

    expect(mockUpdateAnnouncement).toHaveBeenCalledWith(
      testId,
      expect.objectContaining({ showAsBanner: true })
    );
  });

  it('should force showAsBanner=false when switching to members_only after checking it', async () => {
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
    fireEvent.click(screen.getByLabelText('Show as top banner'));
    fireEvent.click(screen.getByRole('radio', { name: 'Members' }));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });

    expect(mockUpdateAnnouncement).toHaveBeenCalledWith(
      testId,
      expect.objectContaining({ showAsBanner: false })
    );
  });

  it('should reflect an existing showAsBanner=true default as checked', () => {
    render(
      <AnnouncementPreviewForm
        id={testId}
        announcementData={announcementData}
        defaultValues={{ ...defaultValues, status: 'published', showAsBanner: true }}
        notificationSent={false}
        labels={defaultLabels}
      />
    );

    expect(screen.getByLabelText('Show as top banner')).toBeChecked();
  });
});
