import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PostAttachment } from '@/lib/games/get-attachments-for-posts';

import { buildAttachmentNodeMap, renderAttachment } from './render-attachment';

afterEach(() => {
  cleanup();
});

vi.mock('@/app/[locale]/(public)/topics/_components/AttachedGameCard', () => ({
  AttachedGameCard: ({ attachment }: { attachment: { id?: string } }) => (
    <div data-testid="game-card" data-id={attachment.id ?? ''} />
  ),
}));
vi.mock('@/app/[locale]/(public)/topics/_components/AttachedEmbedCard', () => ({
  AttachedEmbedCard: ({ attachment }: { attachment: { provider?: string } }) => (
    <div data-testid="embed-card" data-provider={attachment.provider ?? ''} />
  ),
}));
vi.mock('@/app/[locale]/(public)/topics/_components/AttachedImageCard', () => ({
  AttachedImageCard: ({ attachments }: { attachments: ReadonlyArray<{ id?: string }> }) => (
    <div data-testid="image-card" data-count={attachments.length} />
  ),
}));
vi.mock('@/app/[locale]/(public)/topics/_components/AttachedFenCard', () => ({
  AttachedFenCard: ({ attachment }: { attachment: { fen?: string } }) => (
    <div data-testid="fen-card" data-fen={attachment.fen ?? ''} />
  ),
}));
vi.mock('@/app/[locale]/(public)/topics/_components/AttachedVideoCard', () => ({
  AttachedVideoCard: ({
    attachment,
    fallbackTitle,
  }: {
    attachment: { url?: string };
    fallbackTitle: string;
  }) => (
    <div data-testid="video-card" data-url={attachment.url ?? ''} data-fallback={fallbackTitle} />
  ),
}));

describe('renderAttachment — exhaustive kind routing', () => {
  it('routes kind="pgn" to AttachedGameCard', () => {
    const attachment = {
      kind: 'pgn',
      data: { id: 'game-1' },
    } as unknown as PostAttachment;
    render(<>{renderAttachment(attachment, 'fallback')}</>);
    expect(screen.getByTestId('game-card').getAttribute('data-id')).toBe('game-1');
  });

  it('routes kind="embed" to AttachedEmbedCard', () => {
    const attachment = {
      kind: 'embed',
      data: { provider: 'lichess' },
    } as unknown as PostAttachment;
    render(<>{renderAttachment(attachment, 'fallback')}</>);
    expect(screen.getByTestId('embed-card').getAttribute('data-provider')).toBe('lichess');
  });

  it('routes kind="image" to AttachedImageCard with the array forwarded as `attachments`', () => {
    const attachment = {
      kind: 'image',
      data: [{ id: 'img-1' }, { id: 'img-2' }],
    } as unknown as PostAttachment;
    render(<>{renderAttachment(attachment, 'fallback')}</>);
    expect(screen.getByTestId('image-card').getAttribute('data-count')).toBe('2');
  });

  it('routes kind="fen" to AttachedFenCard', () => {
    const attachment = {
      kind: 'fen',
      data: { fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' },
    } as unknown as PostAttachment;
    render(<>{renderAttachment(attachment, 'fallback')}</>);
    expect(screen.getByTestId('fen-card').getAttribute('data-fen')).toContain('rnbqkbnr');
  });

  it('routes kind="video" to AttachedVideoCard and forwards fallbackVideoTitle as fallbackTitle', () => {
    const attachment = {
      kind: 'video',
      data: { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    } as unknown as PostAttachment;
    render(<>{renderAttachment(attachment, 'Untitled clip')}</>);
    const card = screen.getByTestId('video-card');
    expect(card.getAttribute('data-url')).toContain('youtube');
    expect(card.getAttribute('data-fallback')).toBe('Untitled clip');
  });
});

describe('buildAttachmentNodeMap — keyed nodes', () => {
  const imageAttachment = (count: number) =>
    ({
      kind: 'image',
      data: Array.from({ length: count }, (_, i) => ({ id: `img-${i}` })),
    }) as unknown as PostAttachment;

  it('nodes carry a key so rendering them as an array does not warn', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const attachments = new Map<string, PostAttachment>([
      ['p1', imageAttachment(2)],
      ['p2', imageAttachment(1)],
    ]);
    const nodes = buildAttachmentNodeMap(['p1', 'p2'], attachments, 'fallback');
    // Render the per-post nodes as a list — the shape callers use when a
    // page lays out one attachment slot per reply.
    render(<>{['p1', 'p2'].map((id) => nodes.get(id))}</>);
    const warnedAboutKeys = spy.mock.calls.some((call) => String(call[0]).includes('unique "key"'));
    spy.mockRestore();
    expect(warnedAboutKeys).toBe(false);
    expect(screen.getAllByTestId('image-card')).toHaveLength(2);
  });
});
