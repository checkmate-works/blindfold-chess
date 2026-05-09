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
    // The dialog stays mounted to preserve in-progress draft state across
    // open/close cycles. The portal wrapper hides it via `display: none`
    // and `aria-hidden="true"`.
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    const wrapper = dialog!.parentElement!.parentElement!;
    expect(wrapper.className).toContain('hidden');
    expect(wrapper.getAttribute('aria-hidden')).toBe('true');
  });

  // #84: Pre-release reduction → Media tab removed; only Game / Position
  // tabs remain. The PGN-only Game tab and the unchanged FEN Position
  // tab are the supported entry points for this release.
  it('renders two tabs (Game / Position) with the first selected by default', () => {
    setup();
    const tablist = document.querySelector('[role="tablist"]');
    expect(tablist).not.toBeNull();
    const tabs = document.querySelectorAll('[role="tab"]');
    expect(tabs.length).toBe(2);
    const labels = Array.from(tabs).map((t) => t.textContent?.trim());
    expect(labels).toEqual(['Game', 'Position']);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(tabs[1].getAttribute('aria-selected')).toBe('false');
  });

  it('renders two tabpanels and shows only the active one', () => {
    setup();
    const panels = document.querySelectorAll('[role="tabpanel"]');
    expect(panels.length).toBe(2);
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
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
  });

  it('Home jumps to the first tab', () => {
    setup();
    const tabs = document.querySelectorAll('[role="tab"]');
    fireEvent.click(tabs[1]);
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(tabs[1], { key: 'Home' });
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
  });

  it('End jumps to the last tab', () => {
    setup();
    const tabs = document.querySelectorAll('[role="tab"]');
    fireEvent.keyDown(tabs[0], { key: 'End' });
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
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

  it('Game tab with PGN-shaped textarea content emits a pgn mode with raw pgn captured', async () => {
    const { onApply } = setup();
    // Game tab is the default. #84 removes the PGN/URL sub-mode radio
    // split — the tab is now a single PGN textarea.
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
  it('switching tabs preserves each tab’s in-progress state', async () => {
    const { onApply } = setup();
    // Game tab: type a PGN.
    const textarea = document.querySelector('#attachmentPgn') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: PGN_SAMPLE } });

    // Switch to Position, enter a FEN, then back to Game.
    const positionTab = document.querySelectorAll('[role="tab"]')[1] as HTMLButtonElement;
    fireEvent.click(positionTab);
    const fenInput = document.querySelector('#attachmentFen') as HTMLInputElement;
    fireEvent.change(fenInput, { target: { value: VALID_FEN } });
    const gameTab = document.querySelectorAll('[role="tab"]')[0] as HTMLButtonElement;
    fireEvent.click(gameTab);

    // The PGN value persisted.
    const textareaAgain = document.querySelector('#attachmentPgn') as HTMLTextAreaElement;
    expect(textareaAgain.value).toBe(PGN_SAMPLE);

    // Apply emits the active tab's (Game / PGN) mode, not the inactive
    // Position tab's FEN, even though both have content.
    const applyBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent === 'Apply'
    ) as HTMLButtonElement;
    fireEvent.click(applyBtn);
    await waitFor(() => {
      expect(onApply).toHaveBeenCalledTimes(1);
    });
    expect(onApply.mock.calls[0][0].kind).toBe('pgn');
  });
});

describe('AttachmentModal — Game tab URL rejection guard (#84)', () => {
  // Pre-release: every URL shape (Lichess game, Lichess embed, chess.com,
  // study, …) collapses to the same generic "URLs are not accepted"
  // error and Apply stays disabled. The previous per-shape preview hints
  // were load-bearing for the URL sub-mode which no longer exists.
  const LICHESS_GAME_URL = 'https://lichess.org/0zeJx5nICLsH';
  const LICHESS_EMBED_URL = 'https://lichess.org/embed/abcd1234';
  const CHESSCOM_GAME_URL = 'https://www.chess.com/game/live/12345678';
  const LICHESS_STUDY_URL = 'https://lichess.org/study/abcdefgh';

  for (const [label, value] of [
    ['Lichess game URL', LICHESS_GAME_URL],
    ['Lichess embed URL', LICHESS_EMBED_URL],
    ['chess.com game URL', CHESSCOM_GAME_URL],
    ['Lichess study URL', LICHESS_STUDY_URL],
  ] as const) {
    it(`shows the generic URL-rejected error and disables Apply for ${label}`, async () => {
      const { onApply } = setup();
      const textarea = document.querySelector('#attachmentPgn') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value } });

      await waitFor(() => {
        const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
        expect(dialog.textContent).toMatch(/URLs are not accepted/i);
      });

      const applyBtn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent === 'Apply'
      ) as HTMLButtonElement;
      expect(applyBtn.disabled).toBe(true);
      fireEvent.click(applyBtn);
      expect(onApply).not.toHaveBeenCalled();
    });
  }

  it('shows the generic error and disables Apply for non-PGN-non-URL text ("aaa")', async () => {
    const { onApply } = setup();
    const textarea = document.querySelector('#attachmentPgn') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'aaa' } });

    await waitFor(() => {
      const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
      expect(dialog.textContent).toMatch(/URLs are not accepted/i);
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

describe('AttachmentModal — Apply disable across tabs', () => {
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

    // Switch back to Game tab — empty / ok, so Apply must be enabled.
    const gameTab = document.querySelectorAll('[role="tab"]')[0] as HTMLButtonElement;
    fireEvent.click(gameTab);

    const applyBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent === 'Apply'
    ) as HTMLButtonElement;
    expect(applyBtn.disabled).toBe(false);
  });
});

describe('AttachmentModal — keepMounted preserves draft state', () => {
  it('PGN textarea value persists across an isOpen=true → false → true cycle', () => {
    const onApply = vi.fn<(mode: AggregatedAttachmentMode) => void>();
    const onClose = vi.fn();
    const { rerender } = render(
      <AttachmentModal isOpen={true} onClose={onClose} onApply={onApply} />
    );
    const textarea = document.querySelector('#attachmentPgn') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: PGN_SAMPLE } });
    expect(textarea.value).toBe(PGN_SAMPLE);

    // Close.
    rerender(<AttachmentModal isOpen={false} onClose={onClose} onApply={onApply} />);
    const dialogClosed = document.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialogClosed).not.toBeNull();
    const wrapper = dialogClosed.parentElement!.parentElement!;
    expect(wrapper.className).toContain('hidden');

    // Re-open: textarea value still there.
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
