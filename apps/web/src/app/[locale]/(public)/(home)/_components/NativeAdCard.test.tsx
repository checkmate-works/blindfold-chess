import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AdBannerConfig } from '@/lib/ad';

import { NativeAdCard } from './NativeAdCard';

afterEach(() => {
  cleanup();
});

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string }) => (
    <img src={src} alt={alt} {...props} />
  ),
}));

vi.mock('@/app/[locale]/(public)/topics/_components/UserAvatar', () => ({
  UserAvatar: ({ displayName }: { displayName: string }) => (
    <span data-testid="user-avatar">{displayName}</span>
  ),
}));

function createAd(overrides: Partial<AdBannerConfig> = {}): AdBannerConfig {
  return {
    href: 'https://example.com/sponsor',
    imagePath: '/images/banners/ad.webp',
    alt: 'Check out our sponsor',
    width: 400,
    height: 400,
    ...overrides,
  };
}

const defaultProps = {
  adLabel: 'Ad',
  sponsorLabel: 'Sponsor',
  sponsoredLinkLabel: 'Sponsored Link',
  locale: 'en',
};

describe('NativeAdCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render a link to the ad href', () => {
    render(<NativeAdCard ad={createAd()} {...defaultProps} />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://example.com/sponsor');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer sponsored');
  });

  it('should render the sponsor name via UserAvatar', () => {
    render(<NativeAdCard ad={createAd()} {...defaultProps} />);

    expect(screen.getByTestId('user-avatar')).toHaveTextContent('Sponsor');
  });

  it('should render the ad label badge', () => {
    render(<NativeAdCard ad={createAd()} {...defaultProps} />);

    expect(screen.getByText('Ad')).toBeInTheDocument();
  });

  it('should render the ad image with alt text', () => {
    render(<NativeAdCard ad={createAd()} {...defaultProps} />);

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', '/images/banners/ad.webp');
    expect(img).toHaveAttribute('alt', 'Check out our sponsor');
  });

  it('should render the alt text as description', () => {
    render(<NativeAdCard ad={createAd({ alt: 'Premium features available' })} {...defaultProps} />);

    expect(screen.getByText('Premium features available')).toBeInTheDocument();
  });

  it('should render the sponsored link label in the timestamp area', () => {
    render(<NativeAdCard ad={createAd()} {...defaultProps} />);

    expect(screen.getByText('Sponsored Link')).toBeInTheDocument();
  });

  it('should render with Japanese labels', () => {
    render(
      <NativeAdCard
        ad={createAd()}
        adLabel="広告"
        sponsorLabel="スポンサー"
        sponsoredLinkLabel="スポンサーリンク"
        locale="ja"
      />
    );

    expect(screen.getByTestId('user-avatar')).toHaveTextContent('スポンサー');
    expect(screen.getByText('スポンサーリンク')).toBeInTheDocument();
    expect(screen.getByText('広告')).toBeInTheDocument();
  });
});
