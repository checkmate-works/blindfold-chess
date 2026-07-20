import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ResultLikeCta } from './ResultLikeCta';

const useLikeToggleMock = vi.fn();
vi.mock('@/app/[locale]/_hooks/use-like-toggle', () => ({
  useLikeToggle: (...args: unknown[]) => useLikeToggleMock(...args),
}));

vi.mock('@/app/[locale]/_components/AuthPromptModal', () => ({
  AuthPromptModal: () => <div data-testid="auth-prompt-modal" />,
}));

const LABEL = 'Like this puzzle';
const LIKED_LABEL = 'Liked';

afterEach(() => {
  cleanup();
  useLikeToggleMock.mockReset();
});

describe('ResultLikeCta', () => {
  it('renders the CTA when the content was not liked on load', () => {
    useLikeToggleMock.mockReturnValue({
      liked: false,
      isPending: false,
      toggle: vi.fn(),
      isModalOpen: false,
      closeModal: vi.fn(),
    });

    render(
      <ResultLikeCta
        initialLikeCount={0}
        initialLikedByMe={false}
        onToggle={vi.fn()}
        label={LABEL}
        likedLabel={LIKED_LABEL}
      />
    );

    expect(screen.getByText(LABEL)).toBeTruthy();
  });

  it('renders nothing when the content was already liked on load', () => {
    useLikeToggleMock.mockReturnValue({
      liked: true,
      isPending: false,
      toggle: vi.fn(),
      isModalOpen: false,
      closeModal: vi.fn(),
    });

    const { container } = render(
      <ResultLikeCta
        initialLikeCount={1}
        initialLikedByMe={true}
        onToggle={vi.fn()}
        label={LABEL}
        likedLabel={LIKED_LABEL}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('keeps showing the CTA after the user likes it mid-session, flipped to the liked state', () => {
    // Visibility is locked to `initialLikedByMe` (false here), not the live
    // `liked` value — so content that starts unliked must stay visible
    // (as a toggle) even once `liked` flips to true from a click.
    useLikeToggleMock.mockReturnValue({
      liked: true,
      isPending: false,
      toggle: vi.fn(),
      isModalOpen: false,
      closeModal: vi.fn(),
    });

    render(
      <ResultLikeCta
        initialLikeCount={0}
        initialLikedByMe={false}
        onToggle={vi.fn()}
        label={LABEL}
        likedLabel={LIKED_LABEL}
      />
    );

    expect(screen.getByText(LIKED_LABEL)).toBeTruthy();
    expect(screen.queryByText(LABEL)).toBeNull();
  });

  it('stays visible when a server refresh re-passes initialLikedByMe=true after the click', () => {
    // Reproduces the actual bug: clicking invokes a Server Action, and
    // Next.js auto-refreshes this `force-dynamic` route afterward, re-
    // passing `initialLikedByMe` down as `true` on the next render (the DB
    // write already landed). The component must not re-derive its hidden
    // state from that live prop — only from its value at first mount.
    useLikeToggleMock.mockReturnValue({
      liked: true,
      isPending: false,
      toggle: vi.fn(),
      isModalOpen: false,
      closeModal: vi.fn(),
    });

    const { rerender } = render(
      <ResultLikeCta
        initialLikeCount={0}
        initialLikedByMe={false}
        onToggle={vi.fn()}
        label={LABEL}
        likedLabel={LIKED_LABEL}
      />
    );
    expect(screen.getByText(LIKED_LABEL)).toBeTruthy();

    rerender(
      <ResultLikeCta
        initialLikeCount={1}
        initialLikedByMe={true}
        onToggle={vi.fn()}
        label={LABEL}
        likedLabel={LIKED_LABEL}
      />
    );

    expect(screen.getByText(LIKED_LABEL)).toBeTruthy();
  });

  it('calls toggle() when clicked', () => {
    const toggle = vi.fn();
    useLikeToggleMock.mockReturnValue({
      liked: false,
      isPending: false,
      toggle,
      isModalOpen: false,
      closeModal: vi.fn(),
    });

    render(
      <ResultLikeCta
        initialLikeCount={0}
        initialLikedByMe={false}
        onToggle={vi.fn()}
        label={LABEL}
        likedLabel={LIKED_LABEL}
      />
    );

    screen.getByText(LABEL).click();
    expect(toggle).toHaveBeenCalledTimes(1);
  });
});
