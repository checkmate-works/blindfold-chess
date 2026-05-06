import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AttachmentModal } from './AttachmentModal';
import type { AggregatedAttachmentMode } from './AttachmentModal';

vi.mock('@/lib/positions/ui/MiniBoard', () => ({
  MiniBoard: ({ fen }: { fen: string }) => <div data-testid="mini-board" data-fen={fen} />,
}));

afterEach(() => {
  cleanup();
});

const VALID_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const PGN_SAMPLE =
  '[Event "Test"]\n[Site "?"]\n[Date "2024.01.01"]\n[Round "?"]\n[White "A"]\n[Black "B"]\n[Result "1-0"]\n\n1. e4 e5 1-0';
const LICHESS_EMBED_URL = 'https://lichess.org/embed/abcd1234';

function setup(props?: Partial<{ isOpen: boolean }>) {
  const onApply = vi.fn<(mode: AggregatedAttachmentMode) => void>();
  const onClose = vi.fn();
  const result = render(
    <AttachmentModal isOpen={props?.isOpen ?? true} onClose={onClose} onApply={onApply} />
  );
  return { onApply, onClose, ...result };
}

describe('AttachmentModal — rendering and aria roles', () => {
  it('renders with role=dialog + aria-modal=true when open', () => {
    setup();
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
  });

  it('renders nothing when closed', () => {
    setup({ isOpen: false });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('renders three tabs with correct roles and the first tab selected by default', () => {
    setup();
    const tablist = document.querySelector('[role="tablist"]');
    expect(tablist).not.toBeNull();
    const tabs = document.querySelectorAll('[role="tab"]');
    expect(tabs.length).toBe(3);
    const labels = Array.from(tabs).map((t) => t.textContent?.trim());
    expect(labels).toEqual(['Game', 'Position', 'Media']);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(tabs[1].getAttribute('aria-selected')).toBe('false');
    expect(tabs[2].getAttribute('aria-selected')).toBe('false');
  });

  it('renders three tabpanels and shows only the active one', () => {
    setup();
    const panels = document.querySelectorAll('[role="tabpanel"]');
    expect(panels.length).toBe(3);
    // Active panel has hidden=false; inactive ones have hidden attribute.
    const visible = Array.from(panels).filter((p) => !p.hasAttribute('hidden'));
    expect(visible.length).toBe(1);
  });
});

describe('AttachmentModal — keyboard navigation', () => {
  it('ArrowRight moves selection to the next tab', () => {
    setup();
    const firstTab = document.querySelectorAll('[role="tab"]')[0] as HTMLButtonElement;
    fireEvent.keyDown(firstTab, { key: 'ArrowRight' });
    const tabs = document.querySelectorAll('[role="tab"]');
    expect(tabs[0].getAttribute('aria-selected')).toBe('false');
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
  });

  it('ArrowLeft from the first tab wraps to the last tab', () => {
    setup();
    const firstTab = document.querySelectorAll('[role="tab"]')[0] as HTMLButtonElement;
    fireEvent.keyDown(firstTab, { key: 'ArrowLeft' });
    const tabs = document.querySelectorAll('[role="tab"]');
    expect(tabs[2].getAttribute('aria-selected')).toBe('true');
  });

  it('Home jumps to the first tab', () => {
    setup();
    const tabs = document.querySelectorAll('[role="tab"]');
    fireEvent.click(tabs[2]);
    expect(tabs[2].getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(tabs[2], { key: 'Home' });
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
  });

  it('End jumps to the last tab', () => {
    setup();
    const tabs = document.querySelectorAll('[role="tab"]');
    fireEvent.keyDown(tabs[0], { key: 'End' });
    expect(tabs[2].getAttribute('aria-selected')).toBe('true');
  });
});

describe('AttachmentModal — apply per tab', () => {
  it('Position tab apply with a valid FEN emits a fen mode and closes', async () => {
    const { onApply, onClose } = setup();
    const positionTab = document.querySelectorAll('[role="tab"]')[1] as HTMLButtonElement;
    fireEvent.click(positionTab);

    const fenInput = document.querySelector('#attachmentFen') as HTMLInputElement;
    fireEvent.change(fenInput, { target: { value: VALID_FEN } });

    const applyBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent === 'Apply'
    ) as HTMLButtonElement;
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(onApply).toHaveBeenCalledTimes(1);
    });
    const mode = onApply.mock.calls[0][0];
    expect(mode.kind).toBe('fen');
    if (mode.kind === 'fen') {
      expect(mode.fen).toBe(VALID_FEN);
      expect(mode.valid).toBe(true);
    }
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Position tab Apply is disabled while FEN is invalid', () => {
    setup();
    const positionTab = document.querySelectorAll('[role="tab"]')[1] as HTMLButtonElement;
    fireEvent.click(positionTab);

    const fenInput = document.querySelector('#attachmentFen') as HTMLInputElement;
    fireEvent.change(fenInput, { target: { value: 'not a fen' } });

    const applyBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent === 'Apply'
    ) as HTMLButtonElement;
    expect(applyBtn.disabled).toBe(true);
  });

  it('Media tab with image files emits an image mode on apply', async () => {
    const { onApply } = setup();
    const mediaTab = document.querySelectorAll('[role="tab"]')[2] as HTMLButtonElement;
    fireEvent.click(mediaTab);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], 'a.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    const applyBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent === 'Apply'
    ) as HTMLButtonElement;
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(onApply).toHaveBeenCalledTimes(1);
    });
    const mode = onApply.mock.calls[0][0];
    expect(mode.kind).toBe('image');
    if (mode.kind === 'image') {
      expect(mode.files.length).toBe(1);
    }
  });

  it('Media tab with video URL emits a video mode on apply', async () => {
    const { onApply } = setup();
    const mediaTab = document.querySelectorAll('[role="tab"]')[2] as HTMLButtonElement;
    fireEvent.click(mediaTab);

    const videoRadio = document.querySelector(
      'input[name="mediaAttachmentKind"][value="video"]'
    ) as HTMLInputElement;
    fireEvent.click(videoRadio);
    const urlInput = document.querySelector('#attachmentVideoUrl') as HTMLInputElement;
    fireEvent.change(urlInput, {
      target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    });

    const applyBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent === 'Apply'
    ) as HTMLButtonElement;
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(onApply).toHaveBeenCalledTimes(1);
    });
    const mode = onApply.mock.calls[0][0];
    expect(mode.kind).toBe('video');
    if (mode.kind === 'video') {
      expect(mode.url).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    }
  });

  it('Game tab with PGN-shaped textarea content emits a pgn mode with raw pgn captured', async () => {
    const { onApply } = setup();
    // Game tab is selected by default; PGN sub-mode is the default
    // sub-kind, so the PGN textarea is rendered inline.
    const textarea = document.querySelector('#attachmentPgn') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: PGN_SAMPLE } });

    const applyBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent === 'Apply'
    ) as HTMLButtonElement;
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(onApply).toHaveBeenCalledTimes(1);
    });
    const mode = onApply.mock.calls[0][0];
    expect(mode.kind).toBe('pgn');
    if (mode.kind === 'pgn') {
      expect(mode.pgn).toBe(PGN_SAMPLE);
      expect(mode.anonymize).toBe(false);
    }
  });

  it('Game tab with a Lichess embed URL emits an embed mode with provider=lichess', async () => {
    const { onApply } = setup();
    // Switch to URL sub-mode and paste the embed URL into the URL input.
    const urlRadio = document.querySelector(
      'input[name="gameAttachmentKind"][value="url"]'
    ) as HTMLInputElement;
    fireEvent.click(urlRadio);
    const urlInput = document.querySelector('#attachmentUrl') as HTMLInputElement;
    fireEvent.change(urlInput, { target: { value: LICHESS_EMBED_URL } });

    const applyBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent === 'Apply'
    ) as HTMLButtonElement;
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(onApply).toHaveBeenCalledTimes(1);
    });
    const mode = onApply.mock.calls[0][0];
    expect(mode.kind).toBe('embed');
    if (mode.kind === 'embed') {
      expect(mode.provider).toBe('lichess');
      expect(mode.sourceUrl).toBe(LICHESS_EMBED_URL);
    }
  });

  it('apply with no input emits an empty mode', async () => {
    const { onApply, onClose } = setup();
    const applyBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent === 'Apply'
    ) as HTMLButtonElement;
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(onApply).toHaveBeenCalledTimes(1);
    });
    expect(onApply.mock.calls[0][0].kind).toBe('empty');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('AttachmentModal — single-kind structural guarantee (D3)', () => {
  it('Game-tab PGN + Media-tab image both entered: only the active tab’s mode is applied', async () => {
    const { onApply } = setup();
    // Game tab: type PGN into the default PGN sub-mode textarea.
    const textarea = document.querySelector('#attachmentPgn') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: PGN_SAMPLE } });

    // Switch to Media tab, select an image.
    const mediaTab = document.querySelectorAll('[role="tab"]')[2] as HTMLButtonElement;
    fireEvent.click(mediaTab);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, {
      target: { files: [new File(['x'], 'a.png', { type: 'image/png' })] },
    });

    // Apply with Media tab active: the emitted mode is `image`, NOT `pgn`.
    const applyBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent === 'Apply'
    ) as HTMLButtonElement;
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(onApply).toHaveBeenCalledTimes(1);
    });
    const mode = onApply.mock.calls[0][0];
    expect(mode.kind).toBe('image');
  });

  it('switching tabs preserves each tab’s in-progress state', async () => {
    const { onApply } = setup();
    // Position tab: enter a FEN.
    const positionTab = document.querySelectorAll('[role="tab"]')[1] as HTMLButtonElement;
    fireEvent.click(positionTab);
    const fenInput = document.querySelector('#attachmentFen') as HTMLInputElement;
    fireEvent.change(fenInput, { target: { value: VALID_FEN } });

    // Switch away to Media, then back to Position.
    const mediaTab = document.querySelectorAll('[role="tab"]')[2] as HTMLButtonElement;
    fireEvent.click(mediaTab);
    fireEvent.click(positionTab);

    // The FEN value persisted.
    const fenInputAgain = document.querySelector('#attachmentFen') as HTMLInputElement;
    expect(fenInputAgain.value).toBe(VALID_FEN);

    // Apply emits the FEN mode.
    const applyBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent === 'Apply'
    ) as HTMLButtonElement;
    fireEvent.click(applyBtn);
    await waitFor(() => {
      expect(onApply).toHaveBeenCalledTimes(1);
    });
    expect(onApply.mock.calls[0][0].kind).toBe('fen');
  });
});

describe('AttachmentModal — close behavior', () => {
  it('Cancel button calls onClose without onApply', () => {
    const { onApply, onClose } = setup();
    const cancelBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent === 'Cancel'
    ) as HTMLButtonElement;
    fireEvent.click(cancelBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onApply).not.toHaveBeenCalled();
  });

  it('ESC key calls onClose', () => {
    const { onClose } = setup();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});

describe('AttachmentModal — focus trap (a11y)', () => {
  let prevElement: HTMLButtonElement;

  beforeEach(() => {
    prevElement = document.createElement('button');
    prevElement.id = 'trigger-button';
    prevElement.textContent = 'Open';
    document.body.appendChild(prevElement);
    prevElement.focus();
  });

  afterEach(() => {
    if (prevElement.parentNode) prevElement.parentNode.removeChild(prevElement);
  });

  it('moves focus into the dialog when opened', async () => {
    setup();
    await waitFor(() => {
      const dialog = document.querySelector('[role="dialog"]');
      expect(dialog?.contains(document.activeElement)).toBe(true);
    });
  });
});
