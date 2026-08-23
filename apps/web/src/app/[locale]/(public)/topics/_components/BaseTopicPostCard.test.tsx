import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BaseTopicPostCard } from './BaseTopicPostCard';

// The spoiler treatment for puzzle comments is structural: when isSpoiler is
// true the post body MUST be hidden behind a click-to-reveal overlay so the
// solution stays obscured until the reader explicitly opts in. These tests
// pin that structural contract — a future refactor of BaseTopicPostCard
// cannot silently expose puzzle solutions to non-clickers.

vi.mock('@/i18n/use-safe-translations');

vi.mock('@/i18n/routing');

vi.mock('@/app/[locale]/_components', () => ({
  LinkedText: ({ text }: { text: string }) => <span>{text}</span>,
}));

vi.mock('@/app/[locale]/_components/UserAvatar', () => ({
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

  it('renders the spoiler overlay <button> as a sibling of any Link, not nested inside one', () => {
    // Structural invariant: the overlay <button> must NOT live inside an
    // <a> element. <button> nested in <a> is invalid HTML (interactive
    // content inside interactive content) and the click would also be
    // interpreted as link activation. The card uses a timestamp-only
    // permalink instead of a card-wide <Link>, so this is now a pure
    // DOM-shape contract — no event propagation tricks required.
    const { container } = render(<BaseTopicPostCard {...baseProps} isSpoiler />);
    expect(container.querySelectorAll('a button')).toHaveLength(0);
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
// renders Show more as a permalink <Link> to the post detail page.

describe('BaseTopicPostCard expandInline', () => {
  // The truncateContent util truncates above 200 chars; use a comfortably
  // longer string so the preview is strictly shorter than the full text.
  const longContent =
    'A'.repeat(180) +
    ' — and then the bishop sacrifice on h7 forces the king into a mating net via Ng5+ Kg8 Qh5.';

  it('renders Show more as a permalink <a> by default (expandInline=false)', () => {
    const { container } = render(<BaseTopicPostCard {...baseProps} content={longContent} />);

    // Show more navigates to the post detail page when expandInline is
    // false (used by chunks). It must be a real <a> so crawlers can
    // discover the post URL even from feed pages.
    const showMore = screen.getByText('showMore');
    expect(showMore.tagName).toBe('A');
    expect(showMore.getAttribute('href')).toBe(baseProps.postHref);
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

  // Regression: a sub-200-char comment with multiple paragraph breaks
  // (e.g. an opening line, a blank line, then a longer paragraph that
  // wraps within line-clamp-3) is NOT cut by JS-side `truncateContent`,
  // but IS cut visually by the `line-clamp-3` style on the body. Without
  // measuring overflow, "Show more" never appeared and the reader was
  // stuck looking at half a comment with no way to expand it. The body
  // measures its own scrollHeight vs clientHeight to detect that case.
  it('shows Show more when CSS line-clamp visually clips a sub-200-char comment', () => {
    const originalScrollHeight = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollHeight');
    const originalClientHeight = Object.getOwnPropertyDescriptor(Element.prototype, 'clientHeight');
    Object.defineProperty(Element.prototype, 'scrollHeight', {
      configurable: true,
      get: () => 200,
    });
    Object.defineProperty(Element.prototype, 'clientHeight', {
      configurable: true,
      get: () => 60,
    });

    try {
      const subThresholdMultiParagraph =
        'This is a good problem!\n\n' +
        'I thought it was a Discover Attack with Ng1, but surprisingly, the king still had an escape route.\n' +
        'It was difficult for me to find a mate in one move.';
      // Sanity-check the precondition: under the JS truncate threshold.
      expect(subThresholdMultiParagraph.length).toBeLessThan(200);

      render(
        <BaseTopicPostCard {...baseProps} content={subThresholdMultiParagraph} expandInline />
      );

      expect(screen.getByRole('button', { name: 'showMore' })).toBeTruthy();
    } finally {
      if (originalScrollHeight) {
        Object.defineProperty(Element.prototype, 'scrollHeight', originalScrollHeight);
      }
      if (originalClientHeight) {
        Object.defineProperty(Element.prototype, 'clientHeight', originalClientHeight);
      }
    }
  });
});

// Structural HTML validity contract — pinned because every comment surface
// renders user-submitted content via <LinkedText>, which emits inline <a>
// elements for URLs in the post body. Wrapping the card in an outer <Link>
// would nest <a> in <a> (invalid HTML, hydration error in React) and would
// also nest the spoiler <button>, expand-inline <button>, and the
// LikeButton inside an anchor. The card therefore exposes navigation only
// via the timestamp permalink Link.
describe('BaseTopicPostCard nested-anchor invariant', () => {
  it('does NOT render any <a> inside another <a> (no <a><a>)', () => {
    const { container } = render(<BaseTopicPostCard {...baseProps} />);
    expect(container.querySelectorAll('a a')).toHaveLength(0);
  });

  it('renders the timestamp as a permalink <a> with the post detail href', () => {
    render(<BaseTopicPostCard {...baseProps} />);

    const permalink = screen.getByRole('link', { name: 'permalinkAriaLabel' });
    expect(permalink.tagName).toBe('A');
    expect(permalink.getAttribute('href')).toBe(baseProps.postHref);
    // The relative timestamp must live inside the permalink so crawlers see
    // the link as the timestamp permalink (Twitter / Mastodon / GitHub
    // pattern).
    expect(permalink.querySelector('time')).not.toBeNull();
  });
});
