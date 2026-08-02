import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PreferencesTabs } from './PreferencesTabs';

afterEach(() => {
  cleanup();
});

const mockPush = vi.fn();
const mockUseAuth = vi.fn();
let mockTabParam: string | null = null;

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(mockTabParam ? `tab=${mockTabParam}` : ''),
}));

vi.mock('@/app/[locale]/_contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: () => (key: string) => {
    const labels: Record<string, string> = {
      'tabs.board': 'Game',
      'tabs.controls': 'Controls',
      'tabs.appearance': 'Appearance',
      'tabs.privacy': 'Privacy',
      'tabs.notifications': 'Notifications',
    };
    return labels[key] ?? key;
  },
}));

vi.mock('./GameSettings', () => ({
  GameSettings: () => <div data-testid="game-settings" />,
}));
vi.mock('./ControlSettings', () => ({
  ControlSettings: () => <div data-testid="control-settings" />,
}));
vi.mock('./AppearanceSettings', () => ({
  AppearanceSettings: () => <div data-testid="appearance-settings" />,
}));
vi.mock('./NotificationSettings', () => ({
  NotificationSettings: () => <div data-testid="notification-settings" />,
}));
vi.mock('./PrivacySettings', () => ({
  PrivacySettings: () => <div data-testid="privacy-settings" />,
}));

describe('PreferencesTabs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTabParam = null;
  });

  it('does not show the account-level tabs while auth state is still loading', () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: true });
    render(<PreferencesTabs locale="en" />);

    expect(screen.queryByText('Notifications')).toBeNull();
    expect(screen.queryByText('Privacy')).toBeNull();
  });

  it('does not show the account-level tabs for a signed-out visitor', () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false });
    render(<PreferencesTabs locale="en" />);

    expect(screen.queryByText('Notifications')).toBeNull();
    expect(screen.queryByText('Privacy')).toBeNull();
  });

  it('shows the account-level tabs for a signed-in user, Notifications rightmost', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' }, isLoading: false });
    render(<PreferencesTabs locale="en" />);

    const tabButtons = screen.getAllByRole('button');
    expect(tabButtons.map((btn) => btn.textContent)).toEqual([
      'Game',
      'Controls',
      'Appearance',
      'Privacy',
      'Notifications',
    ]);
  });

  it('renders NotificationSettings when the notifications tab is active and the user is signed in', () => {
    mockTabParam = 'notifications';
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' }, isLoading: false });
    render(<PreferencesTabs locale="en" />);

    expect(screen.getByTestId('notification-settings')).toBeDefined();
  });

  it('renders NotificationSettings on ?tab=notifications even while auth is still loading (e.g. a hard reload) — the real gate is server-side', () => {
    mockTabParam = 'notifications';
    mockUseAuth.mockReturnValue({ user: null, isLoading: true });
    render(<PreferencesTabs locale="en" />);

    expect(screen.getByTestId('notification-settings')).toBeDefined();
  });

  it('renders NotificationSettings on ?tab=notifications even when signed out — its own actions redirect to sign-in server-side', () => {
    mockTabParam = 'notifications';
    mockUseAuth.mockReturnValue({ user: null, isLoading: false });
    render(<PreferencesTabs locale="en" />);

    expect(screen.getByTestId('notification-settings')).toBeDefined();
  });

  it('renders PrivacySettings when the privacy tab is active and the user is signed in', () => {
    mockTabParam = 'privacy';
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' }, isLoading: false });
    render(<PreferencesTabs locale="en" />);

    expect(screen.getByTestId('privacy-settings')).toBeDefined();
  });

  it('renders PrivacySettings on ?tab=privacy even while auth is still loading — the real gate is server-side', () => {
    mockTabParam = 'privacy';
    mockUseAuth.mockReturnValue({ user: null, isLoading: true });
    render(<PreferencesTabs locale="en" />);

    expect(screen.getByTestId('privacy-settings')).toBeDefined();
  });

  it('navigates to the notifications tab on click', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' }, isLoading: false });
    render(<PreferencesTabs locale="en" />);

    fireEvent.click(screen.getByText('Notifications'));

    expect(mockPush).toHaveBeenCalledWith('/en/preferences?tab=notifications', { scroll: false });
  });

  it('defaults to the game tab when no tab param is present', () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false });
    render(<PreferencesTabs locale="en" />);

    expect(screen.getByTestId('game-settings')).toBeDefined();
  });
});
