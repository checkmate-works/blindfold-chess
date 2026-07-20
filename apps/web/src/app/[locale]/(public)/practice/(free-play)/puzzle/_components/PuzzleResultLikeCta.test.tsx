import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PuzzleResultLikeCta } from './PuzzleResultLikeCta';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const useLikeToggleMock = vi.fn();
vi.mock('@/app/[locale]/_hooks/use-like-toggle', () => ({
  useLikeToggle: (...args: unknown[]) => useLikeToggleMock(...args),
}));

vi.mock('@/app/[locale]/_components/AuthPromptModal', () => ({
  AuthPromptModal: () => <div data-testid="auth-prompt-modal" />,
}));

afterEach(() => {
  cleanup();
  useLikeToggleMock.mockReset();
});

describe('PuzzleResultLikeCta', () => {
  it('renders the CTA when the puzzle was not liked on load', () => {
    useLikeToggleMock.mockReturnValue({
      liked: false,
      isPending: false,
      toggle: vi.fn(),
      isModalOpen: false,
      closeModal: vi.fn(),
    });

    render(
      <PuzzleResultLikeCta initialLikeCount={0} initialLikedByMe={false} onToggle={vi.fn()} />
    );

    expect(screen.getByText('likeCta')).toBeTruthy();
  });

  it('renders nothing when the puzzle was already liked on load', () => {
    useLikeToggleMock.mockReturnValue({
      liked: true,
      isPending: false,
      toggle: vi.fn(),
      isModalOpen: false,
      closeModal: vi.fn(),
    });

    const { container } = render(
      <PuzzleResultLikeCta initialLikeCount={1} initialLikedByMe={true} onToggle={vi.fn()} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('keeps showing the CTA after the user likes it mid-session, flipped to the liked state', () => {
    // Visibility is locked to `initialLikedByMe` (false here), not the live
    // `liked` value — so a puzzle that starts unliked must stay visible
    // (as a toggle) even once `liked` flips to true from a click.
    useLikeToggleMock.mockReturnValue({
      liked: true,
      isPending: false,
      toggle: vi.fn(),
      isModalOpen: false,
      closeModal: vi.fn(),
    });

    render(
      <PuzzleResultLikeCta initialLikeCount={0} initialLikedByMe={false} onToggle={vi.fn()} />
    );

    expect(screen.getByText('likedCta')).toBeTruthy();
    expect(screen.queryByText('likeCta')).toBeNull();
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
      <PuzzleResultLikeCta initialLikeCount={0} initialLikedByMe={false} onToggle={vi.fn()} />
    );

    screen.getByText('likeCta').click();
    expect(toggle).toHaveBeenCalledTimes(1);
  });
});
