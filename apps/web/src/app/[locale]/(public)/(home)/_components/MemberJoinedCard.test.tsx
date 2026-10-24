import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MemberJoinedFeedData } from '../_lib/types';
import { MemberJoinedCard, MemberJoinedCardPreview } from './MemberJoinedCard';

// --- Mocks ---

vi.mock('@/i18n/use-safe-translations');

// Own factory rather than the shared `__mocks__/routing`: `UserAvatar` also
// calls `useRouter` on render, which that mock leaves out.
vi.mock('@/i18n/routing', () => ({
  Link: ({
    children,
    href,
    locale: _locale,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    locale?: string;
  } & Record<string, unknown>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

const mockDelete = vi.fn();
vi.mock('../_actions/joinAnnouncement', () => ({
  deleteJoinAnnouncementAction: (...args: unknown[]) => mockDelete(...args),
  toggleJoinAnnouncementLikeAction: vi.fn(),
}));

vi.mock('@/app/[locale]/(public)/topics/_components/LikeButton', () => ({
  LikeButton: ({ postId }: { postId: string }) => (
    <button type="button" data-testid="like-button">
      like:{postId}
    </button>
  ),
}));

vi.mock('@/app/[locale]/_components/ConfirmationModal', () => ({
  ConfirmationModal: ({
    isOpen,
    error,
    onConfirm,
    onCancel,
  }: {
    isOpen: boolean;
    error: string | null;
    onConfirm: () => void;
    onCancel: () => void;
  }) =>
    isOpen ? (
      <div data-testid="confirmation-modal">
        {error && <p data-testid="modal-error">{error}</p>}
        <button type="button" onClick={onConfirm}>
          confirm-delete
        </button>
        <button type="button" onClick={onCancel}>
          cancel-delete
        </button>
      </div>
    ) : null,
}));

// --- Helpers ---

const FEED_ID = '11111111-1111-4111-8111-111111111111';

function makeData(overrides: Partial<MemberJoinedFeedData> = {}): MemberJoinedFeedData {
  return {
    member: {
      username: 'alice',
      displayName: 'Alice',
      avatarUrl: null,
      country: 'JP',
      flair: null,
    },
    likeMeta: { likeCount: 2, likedByMe: false },
    isMine: false,
    ...overrides,
  };
}

function renderCard(data: MemberJoinedFeedData, onRemoved = vi.fn()) {
  render(
    <MemberJoinedCard
      feedItemId={FEED_ID}
      data={data}
      createdAt="2026-10-24T00:00:00.000Z"
      locale="en"
      justNowLabel="just now"
      onRemoved={onRemoved}
    />
  );
  return onRemoved;
}

const moreActions = () => screen.queryByRole('button', { name: 'moreActions' });

// --- Tests ---

describe('MemberJoinedCard', () => {
  beforeEach(() => {
    mockDelete.mockReset();
  });

  it('shows the member and the one-line announcement, linked to the profile', () => {
    renderCard(makeData());

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('action')).toBeInTheDocument();
    expect(screen.getByTestId('like-button').textContent).toBe(`like:${FEED_ID}`);
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/u/alice');
  });

  it("renders no actions menu on someone else's card", () => {
    renderCard(makeData({ isMine: false }));

    expect(moreActions()).toBeNull();
    expect(screen.queryByTestId('confirmation-modal')).toBeNull();
  });

  it('lets the owner delete the card and then drops it from the list', async () => {
    mockDelete.mockResolvedValue({ success: true });
    const onRemoved = renderCard(makeData({ isMine: true }));

    fireEvent.click(moreActions()!);
    fireEvent.click(screen.getByRole('menuitem', { name: 'delete.button' }));
    expect(screen.getByTestId('confirmation-modal')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'confirm-delete' }));

    await waitFor(() => expect(onRemoved).toHaveBeenCalledTimes(1));
    expect(mockDelete).toHaveBeenCalledWith(FEED_ID);
    expect(screen.queryByTestId('confirmation-modal')).toBeNull();
  });

  it('keeps the modal open with the error and does not drop the card when deleting fails', async () => {
    mockDelete.mockResolvedValue({ error: 'notFound' });
    const onRemoved = renderCard(makeData({ isMine: true }));

    fireEvent.click(moreActions()!);
    fireEvent.click(screen.getByRole('menuitem', { name: 'delete.button' }));
    fireEvent.click(screen.getByRole('button', { name: 'confirm-delete' }));

    expect(await screen.findByTestId('modal-error')).toHaveTextContent('delete.error');
    expect(screen.getByTestId('confirmation-modal')).toBeInTheDocument();
    expect(onRemoved).not.toHaveBeenCalled();
  });
});

describe('MemberJoinedCardPreview', () => {
  it('is readable and entirely non-interactive', () => {
    const { container } = render(
      <MemberJoinedCardPreview member={makeData().member} locale="en" justNowLabel="just now" />
    );

    // Not `inert`: that would also hide the card from assistive technology.
    expect(container.querySelector('[inert]')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('action')).toBeInTheDocument();
    expect(screen.getByText('just now')).toBeInTheDocument();
  });
});
