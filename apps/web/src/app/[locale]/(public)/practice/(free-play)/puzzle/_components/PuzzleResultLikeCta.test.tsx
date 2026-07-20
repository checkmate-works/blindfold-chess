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
  it('renders the CTA when the puzzle is not yet liked', () => {
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

  it('renders nothing once the puzzle is liked, so a stale "like it" ask never lingers', () => {
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

  it('calls toggle() when clicked', async () => {
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
