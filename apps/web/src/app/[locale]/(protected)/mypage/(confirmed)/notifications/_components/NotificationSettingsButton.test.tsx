import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NotificationSettingsButton } from './NotificationSettingsButton';

afterEach(() => {
  cleanup();
});

const mockSetNotificationMute = vi.fn();

vi.mock('../_actions', () => ({
  setNotificationMute: (...args: unknown[]) => mockSetNotificationMute(...args),
}));

vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: () => (key: string) => {
    const labels: Record<string, string> = {
      'settings.button': 'Settings',
      'settings.title': 'Notification settings',
      'settings.description': 'Turned-off types will no longer send you notifications.',
      'settings.types.new_post': 'New posts',
      'settings.types.new_position': 'New positions',
      'settings.types.new_chunk_draft': 'New chunk drafts',
      'settings.types.chunk_published': 'Chunk published',
      'settings.types.new_game': 'New games',
      'settings.types.new_comment_on_topic': 'Comments on your posts',
    };
    return labels[key] ?? key;
  },
}));

describe('NotificationSettingsButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetNotificationMute.mockResolvedValue(undefined);
  });

  it('does not show the settings panel until the button is clicked', () => {
    render(<NotificationSettingsButton initialMutedTypes={[]} />);

    expect(screen.queryByText('Notification settings')).toBeNull();
  });

  it('opens the panel with a toggle per mutable type on click', () => {
    render(<NotificationSettingsButton initialMutedTypes={[]} />);

    fireEvent.click(screen.getByText('Settings'));

    expect(screen.getByText('Notification settings')).toBeDefined();
    expect(screen.getAllByRole('switch')).toHaveLength(6);
  });

  it('renders a muted type as an off switch and an unmuted type as an on switch', () => {
    render(<NotificationSettingsButton initialMutedTypes={['new_post']} />);

    fireEvent.click(screen.getByText('Settings'));

    expect(screen.getByRole('switch', { name: 'New posts' }).getAttribute('aria-checked')).toBe(
      'false'
    );
    expect(screen.getByRole('switch', { name: 'New games' }).getAttribute('aria-checked')).toBe(
      'true'
    );
  });

  it('calls setNotificationMute(type, true) when toggling an enabled type off', () => {
    render(<NotificationSettingsButton initialMutedTypes={[]} />);
    fireEvent.click(screen.getByText('Settings'));

    fireEvent.click(screen.getByRole('switch', { name: 'New posts' }));

    expect(mockSetNotificationMute).toHaveBeenCalledWith('new_post', true);
    expect(screen.getByRole('switch', { name: 'New posts' }).getAttribute('aria-checked')).toBe(
      'false'
    );
  });

  it('calls setNotificationMute(type, false) when toggling a muted type back on', () => {
    render(<NotificationSettingsButton initialMutedTypes={['new_post']} />);
    fireEvent.click(screen.getByText('Settings'));

    fireEvent.click(screen.getByRole('switch', { name: 'New posts' }));

    expect(mockSetNotificationMute).toHaveBeenCalledWith('new_post', false);
    expect(screen.getByRole('switch', { name: 'New posts' }).getAttribute('aria-checked')).toBe(
      'true'
    );
  });
});
