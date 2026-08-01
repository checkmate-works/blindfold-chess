import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ChunkLinkCardItem } from '@/lib/chunks/types';

import type { Locale } from '@/app/[locale]/_lib/types';

import { ChunkLinkCard } from './ChunkLinkCard';

// The avatar/name and the chunk-reference card have their own coverage — stub
// them so this test focuses on the comment-card framing (name, action line,
// delete affordances) and the grouping of a suggester's run of links.
vi.mock('@/app/[locale]/_components/UserAvatar', () => ({
  UserAvatar: ({ displayName, children }: { displayName: string; children: React.ReactNode }) => (
    <div data-testid="avatar">
      <span>{displayName}</span>
      {children}
    </div>
  ),
}));
vi.mock('./ChunkRefLink', () => ({
  ChunkRefLink: ({ title }: { title: string }) => <div data-testid="chunk-ref">{title}</div>,
}));
// Inline the confirmation modal: render the confirm button when open so the
// test can drive it without the portal / focus-trap. (Modal behaviour is the
// shared component's own concern.)
vi.mock('@/app/[locale]/_components/ConfirmationModal', () => ({
  ConfirmationModal: ({
    isOpen,
    confirmText,
    onConfirm,
  }: {
    isOpen: boolean;
    confirmText: string;
    onConfirm: () => void;
  }) =>
    isOpen ? (
      <div role="dialog">
        <button type="button" data-testid="confirm-unlink" onClick={onConfirm}>
          {confirmText}
        </button>
      </div>
    ) : null,
}));

const LABELS = {
  linkedAction: (count: number) => (count === 1 ? 'linked a chunk' : `linked ${count} chunks`),
  remove: (title: string) => `Remove ${title}`,
  delete: 'Delete',
  confirmUnlinkTitle: 'Unlink this chunk?',
  confirmUnlinkBody: 'It will be removed.',
  confirmCancel: 'Cancel',
  deletedUser: 'Deleted user',
};

function link(id: string, title: string): ChunkLinkCardItem {
  return {
    id,
    chunkId: `c-${id}`,
    slug: id,
    title,
    description: null,
    representativeFen: '8/8/8/8/8/8/8/8 w - - 0 1',
    status: 'published' as const,
    createdAt: new Date('2026-01-02T03:04:05Z'),
    suggestedById: 'u1',
    suggester: { username: 'alice', displayName: 'Alice', avatarUrl: null },
  };
}

function renderCard(
  items: ChunkLinkCardItem[],
  canRemove = false,
  onRemove = vi.fn().mockResolvedValue({})
) {
  render(
    <ChunkLinkCard
      items={items}
      badge="Chunk"
      draftBadge="Draft"
      locale={'en' as Locale}
      canRemove={() => canRemove}
      onRemove={onRemove}
      labels={LABELS}
    />
  );
  return onRemove;
}

describe('ChunkLinkCard', () => {
  it('reads like a comment: one suggester header + action line + the chunk reference', () => {
    renderCard([link('l1', 'Rook battery')]);
    expect(screen.getAllByTestId('avatar')).toHaveLength(1);
    expect(screen.getByText('linked a chunk')).toBeInTheDocument();
    expect(screen.getByTestId('chunk-ref')).toHaveTextContent('Rook battery');
  });

  it('groups a run of links under a single header, one reference card each', () => {
    renderCard([link('l1', 'Rook battery'), link('l2', 'Fianchetto')]);
    // A single avatar header for the whole run.
    expect(screen.getAllByTestId('avatar')).toHaveLength(1);
    const refs = screen.getAllByTestId('chunk-ref');
    expect(refs.map((r) => r.textContent)).toEqual(['Rook battery', 'Fianchetto']);
    expect(screen.getByText('linked 2 chunks')).toBeInTheDocument();
  });

  it('renders a Delete affordance per link when removal is permitted', () => {
    renderCard([link('l1', 'Rook battery'), link('l2', 'Fianchetto')], true);
    expect(screen.getAllByRole('button', { name: /Remove/ })).toHaveLength(2);
  });

  it('confirms via a modal before unlinking — onRemove fires only on confirm', () => {
    const onRemove = renderCard([link('l1', 'Rook battery'), link('l2', 'Fianchetto')], true);

    // Clicking Delete opens the modal but does not unlink yet.
    fireEvent.click(screen.getAllByRole('button', { name: /Remove/ })[1]);
    expect(onRemove).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Confirming in the modal performs the unlink.
    fireEvent.click(screen.getByTestId('confirm-unlink'));
    expect(onRemove).toHaveBeenCalledOnce();
    expect(onRemove.mock.calls[0][0].id).toBe('l2');
  });

  it('hides the Delete affordance when removal is not permitted', () => {
    renderCard([link('l1', 'Rook battery')], false);
    expect(screen.queryByRole('button', { name: /Remove/ })).toBeNull();
  });
});
