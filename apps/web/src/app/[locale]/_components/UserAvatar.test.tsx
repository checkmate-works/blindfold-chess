import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UserAvatar } from './UserAvatar';

const mockPush = vi.fn();

beforeEach(() => {
  mockPush.mockClear();
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
  useRouter: () => ({ push: mockPush }),
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
      // Use getByText to assert the displayName is rendered as its own
      // node, not via a substring match that could be satisfied by the
      // initial-letter fallback (e.g. 'C' + 'Carol' both contain 'Carol').
      expect(screen.getByText('Carol')).toBeDefined();
    });

    it('inline layout ignores children (block-only affordance)', () => {
      render(
        <UserAvatar
          profileHref={null}
          avatarUrl={null}
          displayName="Carol"
          locale="en"
          size="xs"
          layout="inline"
        >
          <span data-testid="inline-child">should-not-render</span>
        </UserAvatar>
      );

      expect(screen.queryByTestId('inline-child')).toBeNull();
    });

    it('block layout renders children passed alongside the displayName', () => {
      // Pair test for the "inline ignores children" assertion above —
      // the same children prop must render in block layout to confirm
      // the inline omission is layout-driven, not children-driven.
      render(
        <UserAvatar
          profileHref={null}
          avatarUrl={null}
          displayName="Carol"
          locale="en"
          size="xs"
          layout="block"
        >
          <span data-testid="block-child">should-render</span>
        </UserAvatar>
      );

      expect(screen.getByTestId('block-child')).toBeDefined();
    });

    it('inline layout renders flair and country flag alongside the name', () => {
      render(
        <UserAvatar
          profileHref={null}
          avatarUrl={null}
          displayName="Frank"
          locale="en"
          size="xs"
          layout="inline"
          flair="GM"
          country="JP"
        />
      );

      expect(screen.getByText('Frank')).toBeDefined();
      expect(screen.getByText('GM')).toBeDefined();
      // countryCodeToFlag('JP') yields the regional indicator pair for J + P.
      // Assert structurally (a non-empty 2-codepoint flag string) rather than
      // hard-coding the emoji literal so the test does not need to depend on
      // editor / encoding round-tripping of high-codepoint characters.
      const expectedFlag = [...'JP']
        .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
        .join('');
      expect(screen.getByText(expectedFlag)).toBeDefined();
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

    it('renders <button> elements (no Link) when asLink=false in block layout', () => {
      const { container } = render(
        <UserAvatar
          profileHref="/u/alice"
          avatarUrl={null}
          displayName="Alice"
          locale="en"
          size="sm"
          asLink={false}
        />
      );

      // No <Link> stub — the entire navigation is imperative via router.push.
      expect(screen.queryByTestId('link')).toBeNull();
      const buttons = container.querySelectorAll('button[type="button"]');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('navigates via router.push when asLink=false button is clicked (block layout)', () => {
      const { container } = render(
        <UserAvatar
          profileHref="/u/alice"
          avatarUrl={null}
          displayName="Alice"
          locale="en"
          size="sm"
          asLink={false}
        />
      );

      const button = container.querySelector('button[type="button"]');
      expect(button).not.toBeNull();
      fireEvent.click(button as Element);

      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith('/u/alice');
    });

    it('navigates via router.push when asLink=false button is clicked (inline layout)', () => {
      render(
        <UserAvatar
          profileHref="/u/alice"
          avatarUrl={null}
          displayName="Alice"
          locale="en"
          size="xs"
          layout="inline"
          asLink={false}
        />
      );

      // Inline layout collapses the wrapper into a single <button> around the
      // avatar + name, so a click on the displayName text triggers push().
      const button = screen.getByText('Alice').closest('button');
      expect(button).not.toBeNull();
      fireEvent.click(button as Element);

      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith('/u/alice');
    });

    it('navigates via router.push when asLink=false avatar-only button is clicked', () => {
      const { container } = render(
        <UserAvatar
          profileHref="/u/alice"
          avatarUrl={null}
          displayName="Alice"
          locale="en"
          size="lg"
          showName={false}
          asLink={false}
        />
      );

      const button = container.querySelector('button[type="button"]');
      expect(button).not.toBeNull();
      fireEvent.click(button as Element);

      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith('/u/alice');
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

    it('renders without crashing when displayName is empty (fallback initial collapses to "")', () => {
      // Pin the current behaviour: an empty displayName produces an empty
      // initial-fallback span (`''.charAt(0).toUpperCase() === ''`). The
      // avatar wrapper still renders, no error is thrown, and no stray
      // single-character node leaks into the output. If we ever decide to
      // render a placeholder glyph instead, this test will fail loudly.
      const { container } = render(
        <UserAvatar profileHref={null} avatarUrl={null} displayName="" locale="en" size="sm" />
      );

      // The rounded fallback wrapper is still present in the DOM.
      const fallbackWrapper = container.querySelector('.rounded-full.bg-muted');
      expect(fallbackWrapper).not.toBeNull();
      // Inner span exists but its text content is empty.
      const initialSpan = fallbackWrapper?.querySelector('span');
      expect(initialSpan).not.toBeNull();
      expect(initialSpan?.textContent).toBe('');
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
