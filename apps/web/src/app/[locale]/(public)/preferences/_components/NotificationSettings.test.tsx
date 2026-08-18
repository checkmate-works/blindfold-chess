import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MUTABLE_NOTIFICATION_TYPES } from '@/lib/notifications/mutable-types';

import { NotificationSettings } from './NotificationSettings';

// Both the skeleton and the loaded list are rendered straight from the
// constant, so the counts are derived rather than spelled out — adding a
// mutable type should not require editing an unrelated magic number here.
const TYPE_COUNT = MUTABLE_NOTIFICATION_TYPES.length;

const mockGetNotificationMutes = vi.fn();
const mockSetNotificationMute = vi.fn();

vi.mock('../_actions', () => ({
  getNotificationMutes: (...args: unknown[]) => mockGetNotificationMutes(...args),
  setNotificationMute: (...args: unknown[]) => mockSetNotificationMute(...args),
}));

vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: () => (key: string) => {
    const labels: Record<string, string> = {
      'notifications.description': 'Turned-off types will no longer send you notifications.',
      'notifications.types.new_position': 'New problem posts',
      'notifications.types.new_chunk_draft': 'New chunk drafts',
      'notifications.types.chunk_published': 'Chunk published',
      'notifications.types.new_game': 'New games',
      'notifications.types.new_comment_on_topic': 'Comments on your posts',
      'notifications.types.game_chunk_linked': 'Chunks linked to your games',
      'notifications.types.repertoire_chunk_linked': 'Chunks linked to your Kata',
    };
    return labels[key] ?? key;
  },
}));

describe('NotificationSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetNotificationMute.mockResolvedValue(undefined);
  });

  it('shows a skeleton with no switches before the mute list resolves', () => {
    mockGetNotificationMutes.mockReturnValue(new Promise(() => {}));
    const { container } = render(<NotificationSettings />);

    expect(screen.queryAllByRole('switch')).toHaveLength(0);
    // One skeleton row per type × 2 shapes (label bar + switch placeholder).
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(TYPE_COUNT * 2);
  });

  it('renders one switch per mutable type once loaded', async () => {
    mockGetNotificationMutes.mockResolvedValue([]);
    render(<NotificationSettings />);

    await waitFor(() => expect(screen.getAllByRole('switch')).toHaveLength(TYPE_COUNT));
  });

  it('renders a muted type as off and an unmuted type as on', async () => {
    mockGetNotificationMutes.mockResolvedValue(['new_position']);
    render(<NotificationSettings />);

    await waitFor(() =>
      expect(
        screen.getByRole('switch', { name: 'New problem posts' }).getAttribute('aria-checked')
      ).toBe('false')
    );
    expect(screen.getByRole('switch', { name: 'New games' }).getAttribute('aria-checked')).toBe(
      'true'
    );
  });

  it('calls setNotificationMute(type, true) when toggling an enabled type off', async () => {
    mockGetNotificationMutes.mockResolvedValue([]);
    render(<NotificationSettings />);
    await waitFor(() => expect(screen.getAllByRole('switch')).toHaveLength(TYPE_COUNT));

    fireEvent.click(screen.getByRole('switch', { name: 'New problem posts' }));

    expect(mockSetNotificationMute).toHaveBeenCalledWith('new_position', true);
    expect(
      screen.getByRole('switch', { name: 'New problem posts' }).getAttribute('aria-checked')
    ).toBe('false');
  });

  it('calls setNotificationMute(type, false) when toggling a muted type back on', async () => {
    mockGetNotificationMutes.mockResolvedValue(['new_position']);
    render(<NotificationSettings />);
    await waitFor(() => expect(screen.getAllByRole('switch')).toHaveLength(TYPE_COUNT));

    fireEvent.click(screen.getByRole('switch', { name: 'New problem posts' }));

    expect(mockSetNotificationMute).toHaveBeenCalledWith('new_position', false);
    expect(
      screen.getByRole('switch', { name: 'New problem posts' }).getAttribute('aria-checked')
    ).toBe('true');
  });
});
