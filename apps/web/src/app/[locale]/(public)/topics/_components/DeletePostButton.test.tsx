import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DeletePostButton } from './DeletePostButton';

afterEach(() => {
  cleanup();
});

vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: () => (key: string) => key,
}));

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
}));

const mockDeleteAction = vi.fn();

describe('DeletePostButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the delete button', () => {
    render(
      <DeletePostButton
        postId="post-1"
        locale="en"
        redirectPath="/topics/squares/e4"
        deletePostAction={mockDeleteAction}
        i18nNamespace="topics.squares.deletePost"
      />
    );

    expect(screen.getByText('button')).toBeDefined();
  });

  it('should show confirm dialog when delete button is clicked', () => {
    render(
      <DeletePostButton
        postId="post-1"
        locale="en"
        redirectPath="/topics/squares/e4"
        deletePostAction={mockDeleteAction}
        i18nNamespace="topics.squares.deletePost"
      />
    );

    fireEvent.click(screen.getByText('button'));

    expect(screen.getByText('confirmTitle')).toBeDefined();
    expect(screen.getByText('confirmMessage')).toBeDefined();
    expect(screen.getByText('confirm')).toBeDefined();
    expect(screen.getByText('cancel')).toBeDefined();
  });

  it('should close dialog when cancel is clicked', () => {
    render(
      <DeletePostButton
        postId="post-1"
        locale="en"
        redirectPath="/topics/squares/e4"
        deletePostAction={mockDeleteAction}
        i18nNamespace="topics.squares.deletePost"
      />
    );

    fireEvent.click(screen.getByText('button'));
    expect(screen.getByText('confirmTitle')).toBeDefined();

    fireEvent.click(screen.getByText('cancel'));
    expect(screen.queryByText('confirmTitle')).toBeNull();
  });

  it('should call deletePostAction and redirect on success', async () => {
    mockDeleteAction.mockResolvedValue({ success: true });

    render(
      <DeletePostButton
        postId="post-1"
        locale="en"
        redirectPath="/topics/openings/sicilian-defense"
        deletePostAction={mockDeleteAction}
        i18nNamespace="topics.squares.deletePost"
      />
    );

    fireEvent.click(screen.getByText('button'));
    fireEvent.click(screen.getByText('confirm'));

    await waitFor(() => {
      expect(mockDeleteAction).toHaveBeenCalledWith('post-1', 'en');
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/topics/openings/sicilian-defense');
    });
  });

  it('should display error message when delete action fails', async () => {
    mockDeleteAction.mockResolvedValue({ error: 'unauthorized' });

    render(
      <DeletePostButton
        postId="post-1"
        locale="en"
        redirectPath="/topics/squares/e4"
        deletePostAction={mockDeleteAction}
        i18nNamespace="topics.squares.deletePost"
      />
    );

    fireEvent.click(screen.getByText('button'));
    fireEvent.click(screen.getByText('confirm'));

    await waitFor(() => {
      expect(screen.getByText('unauthorized')).toBeDefined();
    });

    // Dialog should stay open on error
    expect(screen.getByText('confirmTitle')).toBeDefined();
    // Should not redirect
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should not call deletePostAction until confirm is clicked', () => {
    render(
      <DeletePostButton
        postId="post-1"
        locale="en"
        redirectPath="/topics/squares/e4"
        deletePostAction={mockDeleteAction}
        i18nNamespace="topics.squares.deletePost"
      />
    );

    // Open dialog
    fireEvent.click(screen.getByText('button'));

    expect(mockDeleteAction).not.toHaveBeenCalled();
  });
});
