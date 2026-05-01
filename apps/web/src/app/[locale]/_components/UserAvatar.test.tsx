import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { UserAvatar } from './UserAvatar';

afterEach(() => {
  cleanup();
});

vi.mock('@/i18n/routing', () => ({
  Link: ({
    children,
    href,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    locale?: string;
    className?: string;
  }) => (
    <a href={href} className={className} data-testid="link">
      {children}
    </a>
  ),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    width,
    height,
  }: {
    src: string;
    alt: string;
    width: number;
    height: number;
  }) => (
    // Render as a stub so we can assert on src/alt/width/height without
    // pulling in next/image's runtime requirements.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} width={width} height={height} data-testid="avatar-image" />
  ),
}));

describe('UserAvatar', () => {
  describe('avatar fallback', () => {
    it('renders the uppercase initial when avatarUrl is null', () => {
      render(
        <UserAvatar profileHref={null} avatarUrl={null} displayName="alice" locale="en" size="sm" />
      );

      expect(screen.queryByTestId('avatar-image')).toBeNull();
      expect(screen.getByText('A')).toBeDefined();
    });

    it('renders the next/image element when avatarUrl is provided', () => {
      render(
        <UserAvatar
          profileHref={null}
          avatarUrl="/avatars/alice.jpg"
          displayName="Alice"
          locale="en"
          size="sm"
        />
      );

      const img = screen.getByTestId('avatar-image');
      expect(img).toHaveAttribute('src', '/avatars/alice.jpg');
      expect(img).toHaveAttribute('alt', 'Alice');
    });
  });

  describe('size mapping', () => {
    it('maps xs to a 24px image', () => {
      render(
        <UserAvatar profileHref={null} avatarUrl="/x.png" displayName="X" locale="en" size="xs" />
      );
      const img = screen.getByTestId('avatar-image');
      expect(img).toHaveAttribute('width', '24');
      expect(img).toHaveAttribute('height', '24');
    });

    it('maps sm to a 32px image', () => {
      render(
        <UserAvatar profileHref={null} avatarUrl="/x.png" displayName="X" locale="en" size="sm" />
      );
      const img = screen.getByTestId('avatar-image');
      expect(img).toHaveAttribute('width', '32');
    });

    it('maps md to a 40px image', () => {
      render(
        <UserAvatar profileHref={null} avatarUrl="/x.png" displayName="X" locale="en" size="md" />
      );
      const img = screen.getByTestId('avatar-image');
      expect(img).toHaveAttribute('width', '40');
    });

    it('maps lg to a 64px image', () => {
      render(
        <UserAvatar profileHref={null} avatarUrl="/x.png" displayName="X" locale="en" size="lg" />
      );
      const img = screen.getByTestId('avatar-image');
      expect(img).toHaveAttribute('width', '64');
    });
  });

  describe('layout', () => {
    it('block layout renders displayName and supports children below it', () => {
      render(
        <UserAvatar
          profileHref={null}
          avatarUrl={null}
          displayName="Bob"
          locale="en"
          size="sm"
          layout="block"
        >
          <span data-testid="below-name">below</span>
        </UserAvatar>
      );

      expect(screen.getByText('Bob')).toBeDefined();
      expect(screen.getByTestId('below-name')).toBeDefined();
    });

    it('inline layout renders avatar + name in a single inline-flex container', () => {
      const { container } = render(
        <UserAvatar
          profileHref={null}
          avatarUrl={null}
          displayName="Carol"
          locale="en"
          size="xs"
          layout="inline"
        />
      );

      const inlineWrapper = container.querySelector('.inline-flex');
      expect(inlineWrapper).not.toBeNull();
      expect(inlineWrapper?.textContent).toContain('Carol');
      // Children are intentionally ignored in inline layout — there is no
      // 2-row affordance.
    });
  });

  describe('profileHref → link / no-link', () => {
    it('renders a Link wrapper when profileHref is set', () => {
      render(
        <UserAvatar
          profileHref="/u/alice"
          avatarUrl={null}
          displayName="Alice"
          locale="en"
          size="sm"
        />
      );

      // Block layout with a link wraps both the avatar and the name in
      // separate <Link> elements; either way, the href must be reachable.
      const links = screen.getAllByTestId('link');
      expect(links.length).toBeGreaterThan(0);
      links.forEach((l) => expect(l).toHaveAttribute('href', '/u/alice'));
    });

    it('renders no link when profileHref is null', () => {
      render(
        <UserAvatar profileHref={null} avatarUrl={null} displayName="Alice" locale="en" size="sm" />
      );

      expect(screen.queryByTestId('link')).toBeNull();
    });
  });

  describe('showName=false (avatar-only)', () => {
    it('renders only the avatar (no name, no children)', () => {
      render(
        <UserAvatar
          profileHref={null}
          avatarUrl={null}
          displayName="Dave"
          locale="en"
          size="lg"
          showName={false}
        >
          <span data-testid="children">should-not-render</span>
        </UserAvatar>
      );

      // Name fallback initial is still part of the avatar visual, but the
      // visible displayName text and the children must not render.
      expect(screen.queryByText('Dave')).toBeNull();
      expect(screen.queryByTestId('children')).toBeNull();
      // Initial fallback "D" is the only visible content.
      expect(screen.getByText('D')).toBeDefined();
    });

    it('wraps the avatar in a Link when profileHref is set', () => {
      render(
        <UserAvatar
          profileHref="/u/dave"
          avatarUrl={null}
          displayName="Dave"
          locale="en"
          size="lg"
          showName={false}
        />
      );

      const link = screen.getByTestId('link');
      expect(link).toHaveAttribute('href', '/u/dave');
    });
  });

  describe('legacy compatibility patterns', () => {
    it('supports the topics-style block layout (profileHref + flair + children)', () => {
      render(
        <UserAvatar
          profileHref="/u/alice"
          avatarUrl="/x.png"
          displayName="Alice"
          locale="en"
          size="sm"
          layout="block"
          flair="GM"
        >
          <span data-testid="timestamp">2 hours ago</span>
        </UserAvatar>
      );

      expect(screen.getByText('Alice')).toBeDefined();
      expect(screen.getByText('GM')).toBeDefined();
      expect(screen.getByTestId('timestamp')).toBeDefined();
    });

    it('supports the mypage / ProfileHeader avatar-only pattern with size lg', () => {
      render(
        <UserAvatar
          profileHref={null}
          avatarUrl={null}
          displayName="Eve"
          locale="en"
          size="lg"
          showName={false}
        />
      );

      expect(screen.getByText('E')).toBeDefined();
      expect(screen.queryByText('Eve')).toBeNull();
    });
  });
});
