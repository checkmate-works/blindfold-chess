import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Locale } from '@/app/[locale]/_lib/types';

import { GameMoveContributions } from './GameMoveContributions';

vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: () => Object.assign((key: string) => key, { has: () => true }),
}));

// Hooks own the optimistic state — stub them with fixed data so this test
// isolates the layout: both lists serial, single toggled composer.
vi.mock('../_hooks/use-game-comment-thread', () => ({
  useGameCommentThread: () => ({
    roots: [{ id: 'r1' }],
    commentCount: 1,
    postComment: vi.fn(),
    reply: vi.fn(),
    edit: vi.fn(),
    remove: vi.fn(),
  }),
}));
vi.mock('../_hooks/use-game-chunk-links', () => ({
  useGameChunkLinks: () => ({
    forPly: [
      { id: 'l1', slug: 's', title: 'Linked Chunk', description: null, representativeFen: 'f' },
    ],
    staged: [],
    excludedChunkIds: new Set(),
    submitting: false,
    error: null,
    canRemove: () => false,
    handleSubmit: vi.fn(),
    handleRemoveSaved: vi.fn(),
    stage: vi.fn(),
    unstage: vi.fn(),
  }),
}));
vi.mock('../_lib/game-comment-tree', () => ({ groupReplies: () => [] }));

vi.mock('./GameCommentNode', () => ({ GameCommentNode: () => <div data-testid="comment-node" /> }));
vi.mock('./GameChunkCard', () => ({
  GameChunkCard: ({ title }: { title: string }) => <li data-testid="chunk-card">{title}</li>,
}));
vi.mock('./GameChunkPicker', () => ({
  GameChunkPicker: () => <div data-testid="chunk-picker" />,
}));
vi.mock('./GameCommentForm', () => ({ GameCommentForm: () => <div data-testid="comment-form" /> }));
vi.mock('@/app/[locale]/(public)/topics/_components/JoinConversationToggle', () => ({
  JoinConversationToggle: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="comment-composer">{children}</div>
  ),
}));

const FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 2 2';

function renderPanel(currentUser: { id: string } | null = { id: 'u1' }) {
  render(
    <GameMoveContributions
      gameId="g1"
      currentPly={3}
      currentFen={FEN}
      comments={[]}
      gameChunks={[]}
      availableChunks={[]}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      currentUser={currentUser as any}
      isGameOwner={false}
      locale={'en' as Locale}
    />
  );
}

describe('GameMoveContributions', () => {
  it('shows posted comments and chunk links serially (both visible at once)', () => {
    renderPanel();
    expect(screen.getByTestId('comment-node')).toBeInTheDocument();
    expect(screen.getByTestId('chunk-card')).toHaveTextContent('Linked Chunk');
  });

  it('defaults the composer to comments; only the form toggles, not the lists', () => {
    renderPanel();
    // Comment composer is shown by default; the chunk picker is not.
    expect(screen.getByTestId('comment-composer')).toBeInTheDocument();
    expect(screen.queryByTestId('chunk-picker')).toBeNull();

    // Switching to chunks swaps the composer — the posted lists stay put.
    fireEvent.click(screen.getByRole('button', { name: /chunks\.badge/ }));
    expect(screen.getByTestId('chunk-picker')).toBeInTheDocument();
    expect(screen.queryByTestId('comment-composer')).toBeNull();
    expect(screen.getByTestId('comment-node')).toBeInTheDocument();
    expect(screen.getByTestId('chunk-card')).toBeInTheDocument();
  });

  it('offers the create-from-position link (encoded FEN) in the chunk composer', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: /chunks\.badge/ }));
    expect(screen.getByRole('link', { name: 'chunks.createFromPosition' })).toHaveAttribute(
      'href',
      `/en/chunks/new?fen=${encodeURIComponent(FEN)}`
    );
  });

  it('shows a sign-in prompt instead of the chunk picker for guests', () => {
    renderPanel(null);
    fireEvent.click(screen.getByRole('button', { name: /chunks\.badge/ }));
    expect(screen.queryByTestId('chunk-picker')).toBeNull();
    expect(screen.getByText('chunks.signInToLink')).toBeInTheDocument();
  });
});
