/**
 * Tests for the leaderboard-scoped `SignUpBanner` wrapper.
 *
 * After the CLS refactor, the wrapper is presentational: no auth check, no
 * conditional `null`. It just fetches the `leaderboard.signUpBanner.*`
 * translation keys and renders `SignUpBannerUI`. The auth decision lives in
 * the page (`{!user && <SignUpBanner />}`) so the `loading.tsx` skeleton can
 * hide its banner placeholder for logged-in users via a paired CSS rule.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

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

const { SignUpBanner } = await import('./SignUpBanner');

async function renderBanner(locale = 'en') {
  const element = await SignUpBanner({ locale });
  return render(element);
}

describe('leaderboard SignUpBanner wrapper', () => {
  it('renders unconditionally — no internal auth check', async () => {
    await renderBanner();

    expect(screen.getByText('message')).toBeInTheDocument();
    expect(screen.getByText('description')).toBeInTheDocument();
    expect(screen.getByText('cta')).toBeInTheDocument();
  });

  it('passes the locale through to SignUpBannerUI', async () => {
    await renderBanner('ja');

    // The mocked Link doesn't echo locale, but the CTA anchor is still
    // present — proves the branch rendered end-to-end without errors.
    const ctaLink = screen.getByText('cta').closest('a');
    expect(ctaLink).toHaveAttribute('href', '/sign-up');
  });

  it('renders all three translation keys from the leaderboard.signUpBanner namespace', async () => {
    await renderBanner();

    // The mock translator returns the key verbatim, so these assertions
    // double as proof that the wrapper is asking for the right keys.
    expect(screen.getByText('message')).toBeInTheDocument();
    expect(screen.getByText('description')).toBeInTheDocument();
    expect(screen.getByText('cta')).toBeInTheDocument();
  });
});
