import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FeedItemCard } from './FeedItemCard';

afterEach(() => {
  cleanup();
});

vi.mock('@/i18n/routing', () => ({
  Link: ({
    children,
    href,
    locale,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    locale?: string;
    className?: string;
  }) => (
    <a href={href} data-locale={locale} {...props}>
      {children}
    </a>
  ),
}));

describe('FeedItemCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('internal link (default)', () => {
    it('should render an internal Link when external is not set', () => {
      render(
        <FeedItemCard href="/topics/openings/sicilian" thumbnail={<span>thumb</span>}>
          <p>content</p>
        </FeedItemCard>
      );

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/topics/openings/sicilian');
      expect(link.tagName).toBe('A');
      // Should NOT have target="_blank"
      expect(link).not.toHaveAttribute('target');
    });

    it('should pass locale to the Link component', () => {
      render(
        <FeedItemCard href="/topics" locale="ja" thumbnail={<span>thumb</span>}>
          <p>content</p>
        </FeedItemCard>
      );

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('data-locale', 'ja');
    });
  });

  describe('external link', () => {
    it('should render an anchor tag with target="_blank" when external is true', () => {
      render(
        <FeedItemCard href="https://example.com/ad" external thumbnail={<span>thumb</span>}>
          <p>ad content</p>
        </FeedItemCard>
      );

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', 'https://example.com/ad');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer sponsored');
    });
  });

  describe('thumbnail', () => {
    it('should render the thumbnail content', () => {
      render(
        // eslint-disable-next-line @next/next/no-img-element
        <FeedItemCard href="/test" thumbnail={<img src="/img.png" alt="test-thumb" />}>
          <p>body</p>
        </FeedItemCard>
      );

      expect(screen.getByAltText('test-thumb')).toBeInTheDocument();
    });

    it('should apply thumbnailClassName to the thumbnail container', () => {
      const { container } = render(
        <FeedItemCard
          href="/test"
          thumbnail={<span>thumb</span>}
          thumbnailClassName="rounded-lg overflow-hidden"
        >
          <p>body</p>
        </FeedItemCard>
      );

      const thumbContainer = container.querySelector('.rounded-lg.overflow-hidden');
      expect(thumbContainer).not.toBeNull();
      // Should also retain the base sizing classes
      expect(thumbContainer?.className).toContain('w-20');
      expect(thumbContainer?.className).toContain('flex-shrink-0');
    });

    it('should not add extra spaces when thumbnailClassName is not provided', () => {
      const { container } = render(
        <FeedItemCard href="/test" thumbnail={<span>thumb</span>}>
          <p>body</p>
        </FeedItemCard>
      );

      const thumbContainer = container.querySelector('.w-20');
      expect(thumbContainer).not.toBeNull();
      // The className should not have trailing spaces
      expect(thumbContainer?.className).not.toMatch(/\s$/);
    });
  });

  describe('variant', () => {
    it('should apply feed classes by default', () => {
      render(
        <FeedItemCard href="/test" thumbnail={<span>thumb</span>}>
          <p>body</p>
        </FeedItemCard>
      );

      const link = screen.getByRole('link');
      expect(link.className).toContain('hover:bg-muted/50');
      expect(link.className).not.toContain('border');
    });

    it('should apply feed classes when variant="feed"', () => {
      render(
        <FeedItemCard href="/test" variant="feed" thumbnail={<span>thumb</span>}>
          <p>body</p>
        </FeedItemCard>
      );

      const link = screen.getByRole('link');
      expect(link.className).toContain('hover:bg-muted/50');
      expect(link.className).not.toContain('border-border');
    });

    it('should apply card classes when variant="card"', () => {
      render(
        <FeedItemCard href="/test" variant="card" thumbnail={<span>thumb</span>}>
          <p>body</p>
        </FeedItemCard>
      );

      const link = screen.getByRole('link');
      expect(link.className).toContain('border');
      expect(link.className).toContain('border-border');
      expect(link.className).toContain('bg-card');
      expect(link.className).toContain('rounded-md');
      expect(link.className).not.toContain('hover:bg-muted/50');
    });

    it('should apply card classes to external links when variant="card"', () => {
      render(
        <FeedItemCard
          href="https://example.com"
          external
          variant="card"
          thumbnail={<span>thumb</span>}
        >
          <p>body</p>
        </FeedItemCard>
      );

      const link = screen.getByRole('link');
      expect(link.className).toContain('border-border');
      expect(link.className).toContain('bg-card');
    });
  });

  describe('children', () => {
    it('should render children in the content area', () => {
      render(
        <FeedItemCard href="/test" thumbnail={<span>thumb</span>}>
          <p>child paragraph</p>
          <span>child span</span>
        </FeedItemCard>
      );

      expect(screen.getByText('child paragraph')).toBeInTheDocument();
      expect(screen.getByText('child span')).toBeInTheDocument();
    });
  });
});
