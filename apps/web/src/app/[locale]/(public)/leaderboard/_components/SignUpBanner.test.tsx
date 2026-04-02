import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// --- Mocks ---

const mockGetOptionalUser = vi.fn();
vi.mock('@/lib/auth', () => ({
  getOptionalUser: () => mockGetOptionalUser(),
}));

vi.mock('next-intl/server', () => ({
  getTranslations: () => (key: string) => key,
}));

vi.mock('@/i18n/routing', () => ({
  Link: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    locale?: string;
    className?: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Import the base SignUpBanner directly to test it with leaderboard translation keys
const { SignUpBanner: SignUpBannerBase } = await import('@/app/[locale]/_components/SignUpBanner');

afterEach(() => {
  cleanup();
});

// --- Helpers ---

async function renderSignUpBanner(locale = 'en') {
  // Simulate what the leaderboard wrapper does: resolve translations, then call base component
  const t = (key: string) => key;
  const Component = await SignUpBannerBase({
    locale,
    message: t('message'),
    description: t('description'),
    ctaLabel: t('cta'),
  });
  if (Component === null) return null;
  return render(Component);
}

// --- Tests ---

describe('SignUpBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when user is logged in', () => {
    it('renders null', async () => {
      mockGetOptionalUser.mockResolvedValue({ id: 'user-1' });

      const result = await renderSignUpBanner();

      expect(result).toBeNull();
    });
  });

  describe('when user is not logged in', () => {
    beforeEach(() => {
      mockGetOptionalUser.mockResolvedValue(null);
    });

    it('renders the banner', async () => {
      await renderSignUpBanner();

      expect(screen.getByText('message')).toBeInTheDocument();
      expect(screen.getByText('description')).toBeInTheDocument();
    });

    it('renders the CTA button', async () => {
      await renderSignUpBanner();

      expect(screen.getByText('cta')).toBeInTheDocument();
    });

    it('CTA button links to /sign-up', async () => {
      await renderSignUpBanner();

      const ctaLink = screen.getByText('cta').closest('a');
      expect(ctaLink).toHaveAttribute('href', '/sign-up');
    });

    it('displays all i18n messages (message, description, cta)', async () => {
      await renderSignUpBanner();

      // The base SignUpBanner receives message, description, ctaLabel as props.
      // Our mock translation returns the key itself.
      expect(screen.getByText('message')).toBeInTheDocument();
      expect(screen.getByText('description')).toBeInTheDocument();
      expect(screen.getByText('cta')).toBeInTheDocument();
    });
  });
});
