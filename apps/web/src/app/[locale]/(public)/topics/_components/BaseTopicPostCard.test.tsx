import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BaseTopicPostCard } from './BaseTopicPostCard';

afterEach(() => {
  cleanup();
});

// The spoiler treatment for puzzle comments is structural: when isSpoiler is
// true the post body MUST be wrapped in a <details> disclosure so the solution
// stays hidden until the reader explicitly opens it. These tests pin that
// structural contract — a future refactor of BaseTopicPostCard cannot
// silently expose puzzle solutions to non-clickers.

vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: () => (key: string) => key,
}));

vi.mock('@/i18n/routing', () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={typeof href === 'string' ? href : '#'}>{children}</a>
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
  it('renders content as a plain paragraph when isSpoiler is false', () => {
    render(<BaseTopicPostCard {...baseProps} />);
    expect(screen.queryByRole('group')).toBeNull();
    expect(screen.getByText(baseProps.content)).toBeTruthy();
  });

  it('wraps content in <details>/<summary> disclosure when isSpoiler is true', () => {
    const { container } = render(<BaseTopicPostCard {...baseProps} isSpoiler />);

    const details = container.querySelector('details');
    expect(details).not.toBeNull();
    const summary = details?.querySelector('summary');
    expect(summary).not.toBeNull();
    expect(summary?.textContent).toContain('spoiler.detailsSummary');
    // Disclosure must default to closed so spoiler text is not visible at
    // initial render.
    expect(details?.hasAttribute('open')).toBe(false);
  });

  it('does not render the "show more" hint when isSpoiler is true even if content is truncated', () => {
    // Build a content string long enough to trigger truncation. The
    // truncate-content util is unmocked here; we rely on a >>> threshold
    // length to be safely above any reasonable preview limit.
    const longContent = 'x'.repeat(2000);
    const { container } = render(
      <BaseTopicPostCard {...baseProps} content={longContent} isSpoiler />
    );

    expect(container.querySelector('details')).not.toBeNull();
    // The "showMore" affordance exists on non-spoiler truncated posts only.
    expect(screen.queryByText('showMore')).toBeNull();
  });

  it('defaults to non-spoiler rendering when isSpoiler is omitted', () => {
    const { container } = render(<BaseTopicPostCard {...baseProps} />);
    expect(container.querySelector('details')).toBeNull();
  });
});
