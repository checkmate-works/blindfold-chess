import * as matchers from '@testing-library/jest-dom/matchers';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GoogleOAuthButton } from './GoogleOAuthButton';

expect.extend(matchers);

const mockSignInWithOAuth = vi.fn().mockResolvedValue({ error: null });

vi.mock('@/i18n/use-safe-translations');

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithOAuth: mockSignInWithOAuth,
    },
  }),
}));

describe('GoogleOAuthButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the button with OAuth text', () => {
    render(<GoogleOAuthButton namespace="signIn" />);

    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByText('googleOAuth')).toBeInTheDocument();
  });

  it('should not be disabled initially', () => {
    render(<GoogleOAuthButton namespace="signIn" />);

    expect(screen.getByRole('button')).not.toBeDisabled();
  });

  it('should show loading text and become disabled when clicked', async () => {
    render(<GoogleOAuthButton namespace="signUp" />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(button).toBeDisabled();
    expect(screen.getByText('googleOAuthLoading')).toBeInTheDocument();
  });

  it('should call signInWithOAuth with google provider on click', () => {
    render(<GoogleOAuthButton namespace="signIn" />);

    fireEvent.click(screen.getByRole('button'));

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  });
});
