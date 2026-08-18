import React from 'react';

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LikeButton } from './LikeButton';

afterEach(() => {
  cleanup();
});

vi.mock('@/i18n/use-safe-translations');

vi.mock('@/i18n/use-safe-locale', () => ({
  useSafeLocale: () => 'en',
}));

vi.mock('@/i18n/routing', () => ({
  Link: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('a', props, children),
  redirect: vi.fn(),
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  getPathname: vi.fn(),
}));

const mockUseAuth = vi.fn().mockReturnValue({
  user: { id: 'user-1', email: 'test@example.com' },
});

vi.mock('@/app/[locale]/_contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Unauthenticated clicks open AuthPromptModal, which threads the current path
// into `?next=`; stub it so the hook's next/navigation reads don't need a
// router in the test environment.
vi.mock('@/app/[locale]/_hooks/use-current-path-as-next', () => ({
  useCurrentPathAsNext: () => '/p',
}));

const mockToggleLike = vi.fn();

describe('LikeButton', () => {
  beforeEach(() => {
    mockToggleLike.mockResolvedValue({ liked: true, likeCount: 1 });
  });

  it('should render with unlike aria-label when initialLikedByMe is true', () => {
    render(
      <LikeButton
        postId="post-1"
        locale="en"
        topicKey="e4"
        initialLikeCount={3}
        initialLikedByMe={true}
        toggleLikeAction={mockToggleLike}
        i18nNamespace="topics.squares"
      />
    );

    expect(screen.getByLabelText('unlike')).toBeDefined();
  });

  it('should render with like aria-label when initialLikedByMe is false', () => {
    render(
      <LikeButton
        postId="post-1"
        locale="en"
        topicKey="e4"
        initialLikeCount={0}
        initialLikedByMe={false}
        toggleLikeAction={mockToggleLike}
        i18nNamespace="topics.squares"
      />
    );

    expect(screen.getByLabelText('like')).toBeDefined();
  });

  it('should display like count when greater than 0', () => {
    render(
      <LikeButton
        postId="post-1"
        locale="en"
        topicKey="e4"
        initialLikeCount={5}
        initialLikedByMe={false}
        toggleLikeAction={mockToggleLike}
        i18nNamespace="topics.squares"
      />
    );

    expect(screen.getByText('5')).toBeDefined();
  });

  it('should not display count when like count is 0', () => {
    render(
      <LikeButton
        postId="post-1"
        locale="en"
        topicKey="e4"
        initialLikeCount={0}
        initialLikedByMe={false}
        toggleLikeAction={mockToggleLike}
        i18nNamespace="topics.squares"
      />
    );

    expect(screen.queryByText('0')).toBeNull();
  });

  it('should call toggleLikeAction when clicked', () => {
    render(
      <LikeButton
        postId="post-1"
        locale="en"
        topicKey="e4"
        initialLikeCount={0}
        initialLikedByMe={false}
        toggleLikeAction={mockToggleLike}
        i18nNamespace="topics.squares"
      />
    );

    fireEvent.click(screen.getByRole('button'));

    expect(mockToggleLike).toHaveBeenCalledWith('post-1', 'en', 'e4');
  });

  it('should toggle to liked state after click (not liked -> liked)', async () => {
    // When server returns liked=true, likeCount=1, it should switch to liked state
    mockToggleLike.mockResolvedValue({ liked: true, likeCount: 1 });

    render(
      <LikeButton
        postId="post-1"
        locale="en"
        topicKey="e4"
        initialLikeCount={0}
        initialLikedByMe={false}
        toggleLikeAction={mockToggleLike}
        i18nNamespace="topics.squares"
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    await waitFor(() => {
      expect(screen.getByLabelText('unlike')).toBeDefined();
      expect(screen.getByText('1')).toBeDefined();
    });
  });

  it('should toggle to unliked state after click (liked -> unliked)', async () => {
    // When server returns liked=false, likeCount=2, it should switch to unliked state
    mockToggleLike.mockResolvedValue({ liked: false, likeCount: 2 });

    render(
      <LikeButton
        postId="post-1"
        locale="en"
        topicKey="e4"
        initialLikeCount={3}
        initialLikedByMe={true}
        toggleLikeAction={mockToggleLike}
        i18nNamespace="topics.squares"
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    await waitFor(() => {
      expect(screen.getByLabelText('like')).toBeDefined();
      expect(screen.getByText('2')).toBeDefined();
    });
  });

  it('should reflect server-confirmed values after action completes', async () => {
    // When server returns likeCount=10, the server value should be reflected instead of the optimistic count=1
    mockToggleLike.mockResolvedValue({ liked: true, likeCount: 10 });

    render(
      <LikeButton
        postId="post-1"
        locale="en"
        topicKey="e4"
        initialLikeCount={0}
        initialLikedByMe={false}
        toggleLikeAction={mockToggleLike}
        i18nNamespace="topics.squares"
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    await waitFor(() => {
      expect(screen.getByText('10')).toBeDefined();
      expect(screen.getByLabelText('unlike')).toBeDefined();
    });
  });

  it('should rollback optimistic update on error response', async () => {
    mockToggleLike.mockResolvedValue({ error: 'signInRequired' });

    render(
      <LikeButton
        postId="post-1"
        locale="en"
        topicKey="e4"
        initialLikeCount={5}
        initialLikedByMe={false}
        toggleLikeAction={mockToggleLike}
        i18nNamespace="topics.squares"
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    // After error: should revert to initial values
    await waitFor(() => {
      expect(screen.getByLabelText('like')).toBeDefined();
      expect(screen.getByText('5')).toBeDefined();
    });
  });

  it('should rollback optimistic update on network error', async () => {
    mockToggleLike.mockRejectedValue(new Error('Network error'));

    render(
      <LikeButton
        postId="post-1"
        locale="en"
        topicKey="e4"
        initialLikeCount={2}
        initialLikedByMe={true}
        toggleLikeAction={mockToggleLike}
        i18nNamespace="topics.squares"
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    // After network error: should revert to initial values
    await waitFor(() => {
      expect(screen.getByLabelText('unlike')).toBeDefined();
      expect(screen.getByText('2')).toBeDefined();
    });
  });

  it('should disable button during pending transition', async () => {
    let resolveToggle!: (value: { liked: boolean; likeCount: number }) => void;
    mockToggleLike.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveToggle = resolve;
        })
    );

    render(
      <LikeButton
        postId="post-1"
        locale="en"
        topicKey="e4"
        initialLikeCount={0}
        initialLikedByMe={false}
        toggleLikeAction={mockToggleLike}
        i18nNamespace="topics.squares"
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    // Button should be disabled during transition
    expect(screen.getByRole('button')).toBeDisabled();

    // cleanup
    await act(async () => {
      resolveToggle({ liked: true, likeCount: 1 });
    });
  });

  it('should re-enable button after action completes', async () => {
    mockToggleLike.mockResolvedValue({ liked: true, likeCount: 1 });

    render(
      <LikeButton
        postId="post-1"
        locale="en"
        topicKey="e4"
        initialLikeCount={0}
        initialLikedByMe={false}
        toggleLikeAction={mockToggleLike}
        i18nNamespace="topics.squares"
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    // Button should be re-enabled after action completes
    await waitFor(() => {
      expect(screen.getByRole('button')).not.toBeDisabled();
    });
  });

  it('should re-enable button after error', async () => {
    mockToggleLike.mockRejectedValue(new Error('Server error'));

    render(
      <LikeButton
        postId="post-1"
        locale="en"
        topicKey="e4"
        initialLikeCount={0}
        initialLikedByMe={false}
        toggleLikeAction={mockToggleLike}
        i18nNamespace="topics.squares"
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    // Button should be re-enabled after error
    await waitFor(() => {
      expect(screen.getByRole('button')).not.toBeDisabled();
    });
  });

  it('should not show count when server returns likeCount=0 after unlike', async () => {
    mockToggleLike.mockResolvedValue({ liked: false, likeCount: 0 });

    render(
      <LikeButton
        postId="post-1"
        locale="en"
        topicKey="e4"
        initialLikeCount={1}
        initialLikedByMe={true}
        toggleLikeAction={mockToggleLike}
        i18nNamespace="topics.squares"
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    // Count should not be displayed when likeCount is 0
    await waitFor(() => {
      expect(screen.getByLabelText('like')).toBeDefined();
      expect(screen.queryByText('0')).toBeNull();
    });
  });

  it('should not open auth modal when user is authenticated', async () => {
    mockToggleLike.mockResolvedValue({ liked: true, likeCount: 1 });

    render(
      <LikeButton
        postId="post-1"
        locale="en"
        topicKey="e4"
        initialLikeCount={0}
        initialLikedByMe={false}
        toggleLikeAction={mockToggleLike}
        i18nNamespace="topics.squares"
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    // For authenticated users, toggleLikeAction should be called and no modal should appear
    expect(mockToggleLike).toHaveBeenCalledTimes(1);
  });

  it('should not call toggleLikeAction when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({ user: null });

    render(
      <LikeButton
        postId="post-1"
        locale="en"
        topicKey="e4"
        initialLikeCount={0}
        initialLikedByMe={false}
        toggleLikeAction={mockToggleLike}
        i18nNamespace="topics.squares"
      />
    );

    fireEvent.click(screen.getByRole('button'));

    // For unauthenticated users, toggleLikeAction should not be called
    expect(mockToggleLike).not.toHaveBeenCalled();
  });

  it('should stop event propagation on click', () => {
    const parentClickHandler = vi.fn();

    render(
      <div onClick={parentClickHandler}>
        <LikeButton
          postId="post-1"
          locale="en"
          topicKey="e4"
          initialLikeCount={0}
          initialLikedByMe={false}
          toggleLikeAction={mockToggleLike}
          i18nNamespace="topics.squares"
        />
      </div>
    );

    fireEvent.click(screen.getByRole('button'));

    // Verify click event does not propagate to parent element
    expect(parentClickHandler).not.toHaveBeenCalled();
  });
});
