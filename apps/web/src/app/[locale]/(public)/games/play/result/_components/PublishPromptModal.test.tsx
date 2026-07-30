/**
 * The publish prompt argues the case it was opened from, not one combined
 * feature list: a player who tapped Share came for the replay, one who tapped
 * "join the conversation" came for the thread. Translations resolve through the
 * mocked safe-translations fallback (echoes the key), so the assertions key off
 * the stable message paths.
 */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { GifPreviewSource } from '@/lib/games/gif/preview-frames';

import { PublishPromptModal } from './PublishPromptModal';

vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: () => (key: string) => key,
}));

// The preview is loaded through next/dynamic and exercised by its own test;
// here only its presence or absence matters.
vi.mock('./GameGifPreview', () => ({
  GameGifPreview: () => <div data-testid="gif-preview" />,
}));

const GIF_PREVIEW: GifPreviewSource = {
  variant: 'played',
  source: {
    moves: ['e4', 'e5'],
    startingFen: null,
    setupPlies: null,
    playerColor: 'white',
    result: 'win',
    playSettings: null,
    playSettingsLog: null,
    operationLogs: null,
    undoneLogs: null,
  },
};

const base = { isOpen: true, onClose: vi.fn(), onShare: vi.fn(), isShared: false };

function modalText(): string {
  return screen.getByRole('dialog').textContent ?? '';
}

afterEach(() => cleanup());

describe('PublishPromptModal — share', () => {
  it('leads with the replay and lists the shareable artefacts', () => {
    render(<PublishPromptModal {...base} intent="share" gifPreview={GIF_PREVIEW} />);

    expect(modalText()).toContain('result.shareTitle');
    expect(modalText()).toContain('result.shareGifCaption');
    expect(modalText()).toContain('result.shareUnlock.gif');
    expect(modalText()).toContain('result.shareUnlock.link');
    expect(modalText()).toContain('result.shareUnlock.likes');
  });

  it('still renders without a preview (an unfinished or empty game)', () => {
    render(<PublishPromptModal {...base} intent="share" gifPreview={null} />);

    expect(screen.queryByTestId('gif-preview')).toBeNull();
    expect(modalText()).toContain('result.shareUnlock.gif');
  });
});

describe('PublishPromptModal — discussion', () => {
  it('speaks only to the thread, with no replay animation in the way', () => {
    render(<PublishPromptModal {...base} intent="discussion" showChunks />);

    expect(modalText()).toContain('result.discussionTitle');
    expect(modalText()).toContain('result.discussionPrompt');
    expect(modalText()).toContain('result.shareUnlock.discussion');
    expect(modalText()).toContain('result.shareUnlock.chunks');

    expect(screen.queryByTestId('gif-preview')).toBeNull();
    expect(modalText()).not.toContain('result.shareGifCaption');
    expect(modalText()).not.toContain('result.shareUnlock.gif');
  });

  it('withholds the chunk promise where the published game has no chunk composer', () => {
    // The opening board: chunks are per-move, so promising one there would be a
    // CTA the shared page cannot honour at that position.
    render(<PublishPromptModal {...base} intent="discussion" showChunks={false} />);

    expect(modalText()).toContain('result.shareUnlock.discussion');
    expect(modalText()).not.toContain('result.shareUnlock.chunks');
  });
});
