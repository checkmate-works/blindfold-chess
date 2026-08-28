import * as matchers from '@testing-library/jest-dom/matchers';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AvatarUpload } from './AvatarUpload';

expect.extend(matchers);

const mockShowToast = vi.fn();
const mockRefreshUser = vi.fn();

vi.mock('@/i18n/use-safe-translations');

vi.mock('@/app/[locale]/_contexts/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

vi.mock('@/app/[locale]/_contexts/AuthContext', () => ({
  useAuth: () => ({ refreshUser: mockRefreshUser }),
}));

// next/image renders nothing useful under jsdom for a remote `src`; the tests
// only care that an avatar is considered present, which the remove button's
// visibility already expresses.
vi.mock('next/image', () => ({
  default: ({ alt }: { alt: string }) => <span data-testid="avatar-image">{alt}</span>,
}));

const AVATAR_URL = 'https://storage.example.com/avatars/u/avatar.webp?t=1';

function getRemoveButton() {
  return screen.getByRole('button', { name: 'avatarRemove' });
}

describe('AvatarUpload', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('should not offer removal when there is no avatar', () => {
    render(<AvatarUpload currentAvatarUrl={null} />);

    expect(screen.queryByRole('button', { name: 'avatarRemove' })).not.toBeInTheDocument();
  });

  it('should ask for confirmation before removing rather than deleting on the first click', () => {
    render(<AvatarUpload currentAvatarUrl={AVATAR_URL} />);

    fireEvent.click(getRemoveButton());

    expect(screen.getByText('avatarRemoveConfirmTitle')).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('should leave the avatar untouched when the confirmation is cancelled', () => {
    render(<AvatarUpload currentAvatarUrl={AVATAR_URL} />);

    fireEvent.click(getRemoveButton());
    fireEvent.click(screen.getByRole('button', { name: 'avatarRemoveConfirmCancel' }));

    expect(fetch).not.toHaveBeenCalled();
    expect(screen.getByTestId('avatar-image')).toBeInTheDocument();
  });

  it('should DELETE the avatar, fall back to the placeholder and refresh the header on confirm', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true } as Response);

    render(<AvatarUpload currentAvatarUrl={AVATAR_URL} />);

    fireEvent.click(getRemoveButton());
    fireEvent.click(screen.getByRole('button', { name: 'avatarRemoveConfirmOk' }));

    await waitFor(() => {
      expect(screen.queryByTestId('avatar-image')).not.toBeInTheDocument();
    });
    expect(fetch).toHaveBeenCalledWith('/api/profile/avatar', { method: 'DELETE' });
    expect(mockShowToast).toHaveBeenCalledWith('avatarRemoved', 'success');
    // The header reads the avatar from the auth context, not from this page's
    // props, so it would keep showing the deleted picture without this.
    expect(mockRefreshUser).toHaveBeenCalled();
    expect(screen.queryByText('avatarRemoveConfirmTitle')).not.toBeInTheDocument();
  });

  it('should keep the avatar and report the failure inside the dialog when the request fails', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, json: async () => ({}) } as Response);

    render(<AvatarUpload currentAvatarUrl={AVATAR_URL} />);

    fireEvent.click(getRemoveButton());
    fireEvent.click(screen.getByRole('button', { name: 'avatarRemoveConfirmOk' }));

    await waitFor(() => {
      expect(screen.getByText('avatarRemoveFailed')).toBeInTheDocument();
    });
    // The dialog stays open so the message is where the user is looking, and
    // the avatar is still there because nothing was removed.
    expect(screen.getByText('avatarRemoveConfirmTitle')).toBeInTheDocument();
    expect(screen.getByTestId('avatar-image')).toBeInTheDocument();
  });
});
