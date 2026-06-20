import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { GameChunkItem } from '@/lib/db/game-chunks';

import type { Locale } from '@/app/[locale]/_lib/types';

import { GameChunkLinkCard } from './GameChunkLinkCard';

vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: () => Object.assign((key: string) => key, { has: () => true }),
}));

// The avatar/name and the chunk-reference card have their own coverage — stub
// them so this test focuses on the comment-card framing (name, action line,
// delete affordance).
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

const ITEM: GameChunkItem = {
  id: 'l1',
  ply: 3,
  chunkId: 'c1',
  slug: 'rook-battery',
  title: 'Rook battery',
  description: null,
  representativeFen: '8/8/8/8/8/8/8/8 w - - 0 1',
  createdAt: new Date('2026-01-02T03:04:05Z'),
  suggestedById: 'u1',
  suggester: { username: 'alice', displayName: 'Alice', avatarUrl: null },
};

function renderCard(canRemove: boolean, onRemove = vi.fn()) {
  render(
    <GameChunkLinkCard
      item={ITEM}
      badge="Chunk"
      locale={'en' as Locale}
      canRemove={canRemove}
      onRemove={onRemove}
    />
  );
  return onRemove;
}

describe('GameChunkLinkCard', () => {
  it('reads like a comment: suggester name + "linked a chunk" line + the chunk reference', () => {
    renderCard(false);
    expect(screen.getByTestId('avatar')).toHaveTextContent('Alice');
    expect(screen.getByText('chunks.linkedAction')).toBeInTheDocument();
    expect(screen.getByTestId('chunk-ref')).toHaveTextContent('Rook battery');
  });

  it('shows a Delete affordance only when removal is permitted, and fires onRemove', () => {
    const onRemove = renderCard(true);
    const del = screen.getByRole('button', { name: /chunks\.remove/ });
    expect(del).toHaveTextContent('chunks.delete');
    fireEvent.click(del);
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it('hides the Delete affordance when removal is not permitted', () => {
    renderCard(false);
    expect(screen.queryByRole('button', { name: /chunks\.remove/ })).toBeNull();
  });
});
