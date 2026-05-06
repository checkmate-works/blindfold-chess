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

  it('keeps the dialog mounted but visually hidden when closed (keepMounted opt-in)', () => {
    setup({ isOpen: false });
    // The dialog now stays mounted to preserve in-progress draft state
    // across open/close cycles. The portal wrapper hides it via
    // `display: none` and `aria-hidden="true"`.
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    // Walk up to the portal wrapper that owns the visibility.
    const wrapper = dialog!.parentElement!.parentElement!;
    expect(wrapper.className).toContain('hidden');
    expect(wrapper.getAttribute('aria-hidden')).toBe('true');
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

describe('AttachmentModal — PGN sub-mode URL silent-close guard (Phase 7)', () => {
  const LICHESS_GAME_URL = 'https://lichess.org/0zeJx5nICLsH';
  const CHESSCOM_GAME_URL = 'https://www.chess.com/game/live/12345678';
  const LICHESS_STUDY_URL = 'https://lichess.org/study/abcdefgh';

  it('shows an explicit error when a Lichess game URL is pasted into the PGN textarea', async () => {
    const { onApply } = setup();
    const textarea = document.querySelector('#attachmentPgn') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: LICHESS_GAME_URL } });

    // The PGN sub-mode now surfaces an inline error pointing the user
    // at the Lichess URL tab.
    await waitFor(() => {
      const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
      expect(dialog.textContent).toMatch(/Lichess game URL/i);
      expect(dialog.textContent).toMatch(/Lichess URL tab/i);
    });

    // Phase 8 Fix 4: Apply is disabled while the active tab is in error.
    // Clicking it is a no-op; nothing is emitted to onApply.
    const applyBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent === 'Apply'
    ) as HTMLButtonElement;
    expect(applyBtn.disabled).toBe(true);
    fireEvent.click(applyBtn);
    expect(onApply).not.toHaveBeenCalled();
  });

  it('shows an explicit error when a chess.com game URL is pasted into the PGN textarea', async () => {
    const { onApply } = setup();
    const textarea = document.querySelector('#attachmentPgn') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: CHESSCOM_GAME_URL } });

    await waitFor(() => {
      const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
      expect(dialog.textContent).toMatch(/chess\.com/i);
      expect(dialog.textContent).toMatch(/PGN body/i);
    });

    const applyBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent === 'Apply'
    ) as HTMLButtonElement;
    expect(applyBtn.disabled).toBe(true);
    fireEvent.click(applyBtn);
    expect(onApply).not.toHaveBeenCalled();
  });

  it('shows an explicit error when a Lichess study URL is pasted into the PGN textarea', async () => {
    const { onApply } = setup();
    const textarea = document.querySelector('#attachmentPgn') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: LICHESS_STUDY_URL } });

    await waitFor(() => {
      const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
      expect(dialog.textContent).toMatch(/study URLs are not supported/i);
    });

    const applyBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent === 'Apply'
    ) as HTMLButtonElement;
    expect(applyBtn.disabled).toBe(true);
    fireEvent.click(applyBtn);
    expect(onApply).not.toHaveBeenCalled();
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

describe('AttachmentModal — PGN sub-mode unknown-input guard (Phase 8 Fix 3)', () => {
  it('shows an inline error and disables Apply when non-PGN-non-URL text (e.g. "aaa") is pasted', async () => {
    const { onApply } = setup();
    const textarea = document.querySelector('#attachmentPgn') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'aaa' } });

    await waitFor(() => {
      const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
      expect(dialog.textContent).toMatch(/does not look like a PGN/i);
    });

    const applyBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent === 'Apply'
    ) as HTMLButtonElement;
    expect(applyBtn.disabled).toBe(true);
    fireEvent.click(applyBtn);
    expect(onApply).not.toHaveBeenCalled();
  });
});

describe('AttachmentModal — Apply disable across tabs (Phase 8 Fix 4)', () => {
  it('Game tab: Apply is disabled when the PGN textarea has an unknown-input error', async () => {
    setup();
    const textarea = document.querySelector('#attachmentPgn') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'aaa' } });
    await waitFor(() => {
      const applyBtn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent === 'Apply'
      ) as HTMLButtonElement;
      expect(applyBtn.disabled).toBe(true);
    });
  });

  it('Game tab URL sub-mode: Apply is disabled while a non-supported URL is pasted', async () => {
    setup();
    const urlRadio = document.querySelector(
      'input[name="gameAttachmentKind"][value="url"]'
    ) as HTMLInputElement;
    fireEvent.click(urlRadio);
    const urlInput = document.querySelector('#attachmentUrl') as HTMLInputElement;
    fireEvent.change(urlInput, { target: { value: 'not a url' } });
    await waitFor(() => {
      const applyBtn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent === 'Apply'
      ) as HTMLButtonElement;
      expect(applyBtn.disabled).toBe(true);
    });
  });

  it('Position tab: Apply is disabled while the FEN is invalid (status=error)', () => {
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

  it('Position tab: Apply is enabled when the FEN is valid', () => {
    setup();
    const positionTab = document.querySelectorAll('[role="tab"]')[1] as HTMLButtonElement;
    fireEvent.click(positionTab);
    const fenInput = document.querySelector('#attachmentFen') as HTMLInputElement;
    fireEvent.change(fenInput, { target: { value: VALID_FEN } });
    const applyBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent === 'Apply'
    ) as HTMLButtonElement;
    expect(applyBtn.disabled).toBe(false);
  });

  it('Media video sub-mode: Apply is disabled when the URL fails the YouTube parser', async () => {
    setup();
    const mediaTab = document.querySelectorAll('[role="tab"]')[2] as HTMLButtonElement;
    fireEvent.click(mediaTab);
    const videoRadio = document.querySelector(
      'input[name="mediaAttachmentKind"][value="video"]'
    ) as HTMLInputElement;
    fireEvent.click(videoRadio);
    const urlInput = document.querySelector('#attachmentVideoUrl') as HTMLInputElement;
    fireEvent.change(urlInput, { target: { value: 'https://vimeo.com/12345' } });
    await waitFor(() => {
      const applyBtn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent === 'Apply'
      ) as HTMLButtonElement;
      expect(applyBtn.disabled).toBe(true);
    });
  });

  it('Cancel button stays enabled even when the active tab has a validation error', () => {
    setup();
    const textarea = document.querySelector('#attachmentPgn') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'aaa' } });
    const cancelBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent === 'Cancel'
    ) as HTMLButtonElement;
    expect(cancelBtn.disabled).toBe(false);
  });

  it('Inactive-tab error does NOT block Apply on the active tab', () => {
    setup();
    // Position tab: invalid FEN (error).
    const positionTab = document.querySelectorAll('[role="tab"]')[1] as HTMLButtonElement;
    fireEvent.click(positionTab);
    const fenInput = document.querySelector('#attachmentFen') as HTMLInputElement;
    fireEvent.change(fenInput, { target: { value: 'not a fen' } });

    // Switch back to Game tab — it is empty / ok, so Apply must be enabled.
    const gameTab = document.querySelectorAll('[role="tab"]')[0] as HTMLButtonElement;
    fireEvent.click(gameTab);

    const applyBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent === 'Apply'
    ) as HTMLButtonElement;
    expect(applyBtn.disabled).toBe(false);
  });
});

describe('AttachmentModal — keepMounted preserves draft state (Phase 8 Fix 5)', () => {
  it('PGN textarea value persists across an isOpen=true → false → true cycle', () => {
    const onApply = vi.fn<(mode: AggregatedAttachmentMode) => void>();
    const onClose = vi.fn();
    const { rerender } = render(
      <AttachmentModal isOpen={true} onClose={onClose} onApply={onApply} />
    );
    const textarea = document.querySelector('#attachmentPgn') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: PGN_SAMPLE } });
    expect(textarea.value).toBe(PGN_SAMPLE);

    // Close the modal.
    rerender(<AttachmentModal isOpen={false} onClose={onClose} onApply={onApply} />);
    // The dialog stays mounted (keepMounted) but the wrapper is hidden.
    const dialogClosed = document.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialogClosed).not.toBeNull();
    const wrapper = dialogClosed.parentElement!.parentElement!;
    expect(wrapper.className).toContain('hidden');

    // Re-open: the textarea value is still there.
    rerender(<AttachmentModal isOpen={true} onClose={onClose} onApply={onApply} />);
    const textareaAgain = document.querySelector('#attachmentPgn') as HTMLTextAreaElement;
    expect(textareaAgain.value).toBe(PGN_SAMPLE);
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
