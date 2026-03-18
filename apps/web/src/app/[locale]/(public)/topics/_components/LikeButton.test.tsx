import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LikeButton } from './LikeButton';

afterEach(() => {
  cleanup();
});

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const mockToggleLike = vi.fn();

describe('LikeButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('should perform optimistic update on click (liked)', () => {
    // Start as not liked with count 0
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

    // Optimistic update: should now show unlike and count 1
    expect(screen.getByLabelText('unlike')).toBeDefined();
    expect(screen.getByText('1')).toBeDefined();
  });

  it('should perform optimistic update on click (unliked)', () => {
    // Start as liked with count 3
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

    fireEvent.click(screen.getByRole('button'));

    // Optimistic update: should now show like and count 2
    expect(screen.getByLabelText('like')).toBeDefined();
    expect(screen.getByText('2')).toBeDefined();
  });
});
