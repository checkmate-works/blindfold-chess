import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BaseTopicPostCard } from './BaseTopicPostCard';

afterEach(() => {
  cleanup();
});

// The spoiler treatment for puzzle comments is structural: when isSpoiler is
// true the post body MUST be hidden behind a click-to-reveal overlay so the
// solution stays obscured until the reader explicitly opts in. These tests
// pin that structural contract — a future refactor of BaseTopicPostCard
// cannot silently expose puzzle solutions to non-clickers.

vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: () => (key: string) => key,
}));

// Spy used by the propagation test below. `linkClickSpy` is reset per-test
// via `beforeEach` and stands in for whatever click handler the real Link
// would attach to perform navigation.
const linkClickSpy = vi.fn();

vi.mock('@/i18n/routing', () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={typeof href === 'string' ? href : '#'} onClick={linkClickSpy}>
      {children}
    </a>
  ),
}));

vi.mock('@/app/[locale]/_components', () => ({
  LinkedText: ({ text }: { text: string }) => <span>{text}</span>,
}));

vi.mock('./UserAvatar', () => ({
  UserAvatar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('./PostFooter', () => ({
  PostFooter: () => <div data-testid="post-footer" />,
}));

const baseProps = {
  postId: 'post-1',
  postHref: '/posts/post-1',
  content: 'A clever knight maneuver wins material.',
  createdAt: new Date('2026-04-29T00:00:00.000Z'),
  author: {
    username: 'magnus',
    displayName: 'Magnus',
    avatarUrl: null,
    flair: null,
    country: null,
  },
  locale: 'en',
  topicKey: 'pos-1',
  likeMeta: { likeCount: 0, likedByMe: false },
  replyMeta: { replyCount: 0, latestReplyAt: null, repliers: [], uniqueReplierCount: 0 },
  toggleLikeAction: vi.fn(async () => ({ liked: false, likeCount: 0 })),
  i18nNamespace: 'topics',
  justNowLabel: 'just now',
};

describe('BaseTopicPostCard isSpoiler', () => {
  beforeEach(() => {
    linkClickSpy.mockReset();
  });

  it('renders content directly with no overlay when isSpoiler is false', () => {
    const { container } = render(<BaseTopicPostCard {...baseProps} />);

    expect(container.querySelector('details')).toBeNull();
    expect(screen.getByText(baseProps.content)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'spoiler.overlayAriaLabel' })).toBeNull();
  });

  it('renders an overlay button hiding the body when isSpoiler is true', () => {
    render(<BaseTopicPostCard {...baseProps} isSpoiler />);

    const overlay = screen.getByRole('button', { name: 'spoiler.overlayAriaLabel' });
    expect(overlay).toBeTruthy();
    expect(overlay.tagName).toBe('BUTTON');
    expect(overlay.getAttribute('type')).toBe('button');
    expect(overlay.textContent).toContain('spoiler.overlayTitle');
    expect(overlay.textContent).toContain('spoiler.overlayHint');

    // Body paragraph still exists in the DOM (it sits underneath the overlay)
    // but is marked aria-hidden so screen readers do not leak the solution
    // before the user opts in.
    const bodyParagraph = screen.getByText(baseProps.content).closest('p');
    expect(bodyParagraph?.getAttribute('aria-hidden')).toBe('true');
  });

  it('reveals the body and removes the overlay after the overlay is clicked', () => {
    render(<BaseTopicPostCard {...baseProps} isSpoiler />);

    const overlay = screen.getByRole('button', { name: 'spoiler.overlayAriaLabel' });
    fireEvent.click(overlay);

    // Overlay is gone after reveal.
    expect(screen.queryByRole('button', { name: 'spoiler.overlayAriaLabel' })).toBeNull();
    // Body is no longer aria-hidden.
    const bodyParagraph = screen.getByText(baseProps.content).closest('p');
    expect(bodyParagraph?.getAttribute('aria-hidden')).toBeNull();
    // The body wrapper carries `aria-live="polite"` so screen readers
    // announce the just-revealed comment to the user who opted in.
    expect(bodyParagraph?.parentElement?.getAttribute('aria-live')).toBe('polite');
  });

  it('does not propagate the overlay click to the parent Link (no navigation)', () => {
    render(<BaseTopicPostCard {...baseProps} isSpoiler />);

    const overlay = screen.getByRole('button', { name: 'spoiler.overlayAriaLabel' });
    fireEvent.click(overlay);

    // The parent <Link>'s React onClick must NOT be invoked, because
    // overlay's onClick calls stopPropagation. This is what guarantees the
    // user does not get navigated to the post detail page when toggling
    // the spoiler reveal.
    expect(linkClickSpy).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'spoiler.overlayAriaLabel' })).toBeNull();
  });

  it('does not render the "show more" hint while the spoiler is still hidden', () => {
    const longContent = 'x'.repeat(2000);
    render(<BaseTopicPostCard {...baseProps} content={longContent} isSpoiler />);

    expect(screen.getByRole('button', { name: 'spoiler.overlayAriaLabel' })).toBeTruthy();
    expect(screen.queryByText('showMore')).toBeNull();
  });

  it('renders the "show more" hint after the spoiler is revealed (matches non-spoiler behavior)', () => {
    const longContent = 'x'.repeat(2000);
    render(<BaseTopicPostCard {...baseProps} content={longContent} isSpoiler />);

    fireEvent.click(screen.getByRole('button', { name: 'spoiler.overlayAriaLabel' }));

    expect(screen.getByText('showMore')).toBeTruthy();
  });

  it('defaults to non-spoiler rendering when isSpoiler is omitted', () => {
    const { container } = render(<BaseTopicPostCard {...baseProps} />);

    expect(container.querySelector('details')).toBeNull();
    expect(screen.queryByRole('button', { name: 'spoiler.overlayAriaLabel' })).toBeNull();
  });
});
