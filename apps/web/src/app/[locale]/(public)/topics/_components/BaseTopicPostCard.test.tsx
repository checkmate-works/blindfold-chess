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

// expandInline pins the "Show more" inline-expansion behavior used by the
// position-memory and puzzle PostCards, where there is no per-post detail
// page to navigate to. The default (`expandInline=false`, used by chunks)
// keeps the legacy non-interactive `<span>` so that clicking the card area
// continues to navigate via the surrounding <Link>.

describe('BaseTopicPostCard expandInline', () => {
  beforeEach(() => {
    linkClickSpy.mockReset();
  });

  // The truncateContent util truncates above 200 chars; use a comfortably
  // longer string so the preview is strictly shorter than the full text.
  const longContent =
    'A'.repeat(180) +
    ' — and then the bishop sacrifice on h7 forces the king into a mating net via Ng5+ Kg8 Qh5.';

  it('renders Show more as a non-interactive <span> by default (expandInline=false)', () => {
    const { container } = render(<BaseTopicPostCard {...baseProps} content={longContent} />);

    const showMore = screen.getByText('showMore');
    expect(showMore.tagName).toBe('SPAN');
    // Body is the truncated preview, not the full content.
    expect(container.textContent).not.toContain('mating net via Ng5+');
  });

  it('renders Show more as a <button> when expandInline is true', () => {
    render(<BaseTopicPostCard {...baseProps} content={longContent} expandInline />);

    const showMore = screen.getByRole('button', { name: 'showMore' });
    expect(showMore.tagName).toBe('BUTTON');
    expect(showMore.getAttribute('type')).toBe('button');
    expect(showMore.getAttribute('aria-controls')).toBe(`post-body-${baseProps.postId}`);
    expect(showMore.getAttribute('aria-expanded')).toBe('false');
  });

  it('expands the body inline and hides Show more after click (expandInline=true)', () => {
    const { container } = render(
      <BaseTopicPostCard {...baseProps} content={longContent} expandInline />
    );

    // Before click: only the truncated preview is rendered.
    expect(container.textContent).not.toContain('mating net via Ng5+');

    fireEvent.click(screen.getByRole('button', { name: 'showMore' }));

    // After click: full content is rendered.
    expect(container.textContent).toContain('mating net via Ng5+');
    // Show more is gone (no more affordance to click; nothing left to expand).
    expect(screen.queryByRole('button', { name: 'showMore' })).toBeNull();
    // The body <p> no longer carries line-clamp-3 once expanded.
    const bodyParagraph = container.querySelector(`p[id="post-body-${baseProps.postId}"]`);
    expect(bodyParagraph?.className).not.toContain('line-clamp-3');
  });

  it('does not navigate the parent Link when Show more is clicked (expandInline=true)', () => {
    render(<BaseTopicPostCard {...baseProps} content={longContent} expandInline />);

    fireEvent.click(screen.getByRole('button', { name: 'showMore' }));

    // The parent <Link>'s React onClick must NOT be invoked, because the
    // Show more button's onClick calls stopPropagation. The user opted in
    // to inline expansion, not navigation.
    expect(linkClickSpy).not.toHaveBeenCalled();
  });

  it('does not show Show more while a spoiler is still hidden (expandInline=true)', () => {
    render(<BaseTopicPostCard {...baseProps} content={longContent} expandInline isSpoiler />);

    expect(screen.getByRole('button', { name: 'spoiler.overlayAriaLabel' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'showMore' })).toBeNull();
    expect(screen.queryByText('showMore')).toBeNull();
  });

  it('shows Show more after the spoiler is revealed and inline-expands on click', () => {
    const { container } = render(
      <BaseTopicPostCard {...baseProps} content={longContent} expandInline isSpoiler />
    );

    // Reveal the spoiler first.
    fireEvent.click(screen.getByRole('button', { name: 'spoiler.overlayAriaLabel' }));
    // Show more is now an inline-expand button.
    const showMore = screen.getByRole('button', { name: 'showMore' });
    expect(showMore.tagName).toBe('BUTTON');

    fireEvent.click(showMore);

    expect(container.textContent).toContain('mating net via Ng5+');
    expect(screen.queryByRole('button', { name: 'showMore' })).toBeNull();
  });
});
