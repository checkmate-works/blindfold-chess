import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GoogleSignInButton } from './GoogleSignInButton';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

const mockSignInWithOAuth = vi.fn().mockResolvedValue({ error: null });

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithOAuth: mockSignInWithOAuth,
    },
  }),
}));

describe('GoogleSignInButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the sign-in button with Google text', () => {
    render(<GoogleSignInButton />);

    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByText('signInWithGoogle')).toBeInTheDocument();
  });

  it('should not be disabled initially', () => {
    render(<GoogleSignInButton />);

    expect(screen.getByRole('button')).not.toBeDisabled();
  });

  it('should show loading text and become disabled when clicked', async () => {
    render(<GoogleSignInButton />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(button).toBeDisabled();
    expect(screen.getByText('signingIn')).toBeInTheDocument();
  });

  it('should call signInWithOAuth with google provider on click', () => {
    render(<GoogleSignInButton />);

    fireEvent.click(screen.getByRole('button'));

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  });
});
