import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NotificationSettings } from './NotificationSettings';

afterEach(() => {
  cleanup();
});

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
      'notifications.loading': 'Loading…',
      'notifications.types.new_post': 'New posts',
      'notifications.types.new_position': 'New positions',
      'notifications.types.new_chunk_draft': 'New chunk drafts',
      'notifications.types.chunk_published': 'Chunk published',
      'notifications.types.new_game': 'New games',
      'notifications.types.new_comment_on_topic': 'Comments on your posts',
    };
    return labels[key] ?? key;
  },
}));

describe('NotificationSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetNotificationMute.mockResolvedValue(undefined);
  });

  it('shows a loading state before the mute list resolves', () => {
    mockGetNotificationMutes.mockReturnValue(new Promise(() => {}));
    render(<NotificationSettings />);

    expect(screen.getByText('Loading…')).toBeDefined();
  });

  it('renders one switch per mutable type once loaded', async () => {
    mockGetNotificationMutes.mockResolvedValue([]);
    render(<NotificationSettings />);

    await waitFor(() => expect(screen.getAllByRole('switch')).toHaveLength(6));
  });

  it('renders a muted type as off and an unmuted type as on', async () => {
    mockGetNotificationMutes.mockResolvedValue(['new_post']);
    render(<NotificationSettings />);

    await waitFor(() =>
      expect(screen.getByRole('switch', { name: 'New posts' }).getAttribute('aria-checked')).toBe(
        'false'
      )
    );
    expect(screen.getByRole('switch', { name: 'New games' }).getAttribute('aria-checked')).toBe(
      'true'
    );
  });

  it('calls setNotificationMute(type, true) when toggling an enabled type off', async () => {
    mockGetNotificationMutes.mockResolvedValue([]);
    render(<NotificationSettings />);
    await waitFor(() => expect(screen.getAllByRole('switch')).toHaveLength(6));

    fireEvent.click(screen.getByRole('switch', { name: 'New posts' }));

    expect(mockSetNotificationMute).toHaveBeenCalledWith('new_post', true);
    expect(screen.getByRole('switch', { name: 'New posts' }).getAttribute('aria-checked')).toBe(
      'false'
    );
  });

  it('calls setNotificationMute(type, false) when toggling a muted type back on', async () => {
    mockGetNotificationMutes.mockResolvedValue(['new_post']);
    render(<NotificationSettings />);
    await waitFor(() => expect(screen.getAllByRole('switch')).toHaveLength(6));

    fireEvent.click(screen.getByRole('switch', { name: 'New posts' }));

    expect(mockSetNotificationMute).toHaveBeenCalledWith('new_post', false);
    expect(screen.getByRole('switch', { name: 'New posts' }).getAttribute('aria-checked')).toBe(
      'true'
    );
  });
});
