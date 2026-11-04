import * as matchers from '@testing-library/jest-dom/matchers';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LoginMethodsCard } from './LoginMethodsCard';

expect.extend(matchers);

const mockShowToast = vi.fn();
const mockReplace = vi.fn();
const mockRequestPasswordSetup = vi.fn();
const mockUnlinkLoginIdentity = vi.fn();
const mockLinkIdentity = vi.fn();

vi.mock('@/i18n/use-safe-translations');
vi.mock('@/i18n/use-safe-locale', () => ({ useSafeLocale: () => 'ja' }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: mockReplace }) }));
vi.mock('@/app/[locale]/_contexts/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { linkIdentity: mockLinkIdentity } }),
}));
vi.mock('../_actions/requestPasswordSetup', () => ({
  requestPasswordSetup: (...args: unknown[]) => mockRequestPasswordSetup(...args),
}));
vi.mock('../_actions/unlinkLoginIdentity', () => ({
  unlinkLoginIdentity: (...args: unknown[]) => mockUnlinkLoginIdentity(...args),
}));

const google = { id: 'id-google', provider: 'google' as const, email: 'a@gmail.com' };
const googleB = { id: 'id-google-b', provider: 'google' as const, email: 'b@gmail.com' };
const emailIdentity = { id: 'id-email', provider: 'email' as const, email: 'me@example.com' };

describe('LoginMethodsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUnlinkLoginIdentity.mockResolvedValue({ success: true });
    mockRequestPasswordSetup.mockResolvedValue({ success: true, email: 'me@example.com' });
    mockLinkIdentity.mockResolvedValue({ error: null });
  });

  it('offers "set a password" to an account without one and "change" to one with it', () => {
    const { rerender } = render(
      <LoginMethodsCard identities={[google]} hasPassword={false} email="me@example.com" />
    );
    expect(screen.getByRole('button', { name: 'password.setup' })).toBeInTheDocument();

    rerender(<LoginMethodsCard identities={[google]} hasPassword email="me@example.com" />);
    expect(screen.getByRole('button', { name: 'password.change' })).toBeInTheDocument();
  });

  it('lists one row per non-email identity and never a row for the email identity', () => {
    render(
      <LoginMethodsCard
        identities={[emailIdentity, google, googleB]}
        hasPassword
        email="me@example.com"
      />
    );

    expect(screen.getByText('a@gmail.com')).toBeInTheDocument();
    expect(screen.getByText('b@gmail.com')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'remove' })).toHaveLength(2);
  });

  it('disables Remove with the reason when it would leave no web login', () => {
    render(<LoginMethodsCard identities={[google]} hasPassword={false} email="me@example.com" />);

    expect(screen.getByRole('button', { name: 'remove' })).toBeDisabled();
    expect(screen.getByText('cannotRemove.lastWebMethod')).toBeInTheDocument();
  });

  it('asks for confirmation and only unlinks on confirm', async () => {
    render(<LoginMethodsCard identities={[google]} hasPassword email="me@example.com" />);

    fireEvent.click(screen.getByRole('button', { name: 'remove' }));
    expect(screen.getByText('confirmRemove.title')).toBeInTheDocument();
    expect(mockUnlinkLoginIdentity).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'confirmRemove.cancel' }));
    expect(mockUnlinkLoginIdentity).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'remove' }));
    fireEvent.click(screen.getByRole('button', { name: 'confirmRemove.ok' }));

    await waitFor(() => expect(mockUnlinkLoginIdentity).toHaveBeenCalledWith('id-google'));
    expect(mockShowToast).toHaveBeenCalledWith('removedToast', 'success');
    expect(mockReplace).toHaveBeenCalledWith('/ja/mypage/account');
  });

  it('maps an unlink error code to its dictionary entry', async () => {
    mockUnlinkLoginIdentity.mockResolvedValue({ error: 'removal:lastWebMethod' });
    render(<LoginMethodsCard identities={[google]} hasPassword email="me@example.com" />);

    fireEvent.click(screen.getByRole('button', { name: 'remove' }));
    fireEvent.click(screen.getByRole('button', { name: 'confirmRemove.ok' }));

    await waitFor(() =>
      expect(mockShowToast).toHaveBeenCalledWith('errors.removal:lastWebMethod', 'error')
    );
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('sends the password email and reports the address it went to', async () => {
    render(<LoginMethodsCard identities={[google]} hasPassword={false} email="me@example.com" />);

    fireEvent.click(screen.getByRole('button', { name: 'password.setup' }));

    await waitFor(() =>
      expect(mockShowToast).toHaveBeenCalledWith('password.sentToast', 'success')
    );
  });

  it('hands off to the auth server with the link marker on the callback URL', async () => {
    render(<LoginMethodsCard identities={[]} hasPassword email="me@example.com" />);

    fireEvent.click(screen.getByRole('button', { name: 'google.add' }));

    await waitFor(() => expect(mockLinkIdentity).toHaveBeenCalled());
    const { provider, options } = mockLinkIdentity.mock.calls[0][0];
    expect(provider).toBe('google');
    expect(new URL(options.redirectTo).searchParams.get('link')).toBe('google');
    expect(new URL(options.redirectTo).pathname).toBe('/auth/callback');
  });
});
