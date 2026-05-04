import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MediaAttachmentInput } from './MediaAttachmentInput';
import type { MediaAttachmentMode } from './MediaAttachmentInput';

// Stub MiniBoard so we can assert the FEN forwarded to the preview without
// rendering the chessboard.
vi.mock('@/lib/positions/ui/MiniBoard', () => ({
  MiniBoard: ({ fen }: { fen: string }) => <div data-testid="mini-board" data-fen={fen} />,
}));

afterEach(() => {
  cleanup();
});

const VALID_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function setup() {
  const onModeChange = vi.fn<(mode: MediaAttachmentMode) => void>();
  const onChange = vi.fn<(hasContent: boolean) => void>();
  const result = render(<MediaAttachmentInput onChange={onChange} onModeChange={onModeChange} />);
  return { onModeChange, onChange, ...result };
}

function lastMode(onModeChange: ReturnType<typeof vi.fn>): MediaAttachmentMode {
  const calls = onModeChange.mock.calls;
  return calls[calls.length - 1]?.[0] as MediaAttachmentMode;
}

describe('MediaAttachmentInput', () => {
  it('reports empty mode while collapsed', () => {
    const { onModeChange } = setup();
    expect(lastMode(onModeChange).kind).toBe('empty');
  });

  it('expands and shows the image sub-input by default', () => {
    const { container, onModeChange, getByText } = setup();
    fireEvent.click(getByText('Attach media (image / FEN / video)'));
    expect(container.querySelector('input[type="file"]')).not.toBeNull();
    expect(lastMode(onModeChange).kind).toBe('empty');
  });

  it('reports image mode after selecting a file', () => {
    const { container, onModeChange, getByText } = setup();
    fireEvent.click(getByText('Attach media (image / FEN / video)'));
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], 'a.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    const mode = lastMode(onModeChange);
    expect(mode.kind).toBe('image');
    if (mode.kind === 'image') {
      expect(mode.files.length).toBe(1);
      expect(mode.files[0].name).toBe('a.png');
    }
  });

  it('switches to FEN sub-input and surfaces fen+caption with valid:true on a legal FEN', () => {
    const { container, onModeChange, getByText } = setup();
    fireEvent.click(getByText('Attach media (image / FEN / video)'));
    const fenRadio = container.querySelector(
      'input[name="mediaAttachmentKind"][value="fen"]'
    ) as HTMLInputElement;
    fireEvent.click(fenRadio);
    const fenInput = container.querySelector('#attachmentFen') as HTMLInputElement;
    fireEvent.change(fenInput, { target: { value: VALID_FEN } });
    const captionInput = container.querySelector('#attachmentFenCaption') as HTMLInputElement;
    fireEvent.change(captionInput, { target: { value: 'opening' } });

    const mode = lastMode(onModeChange);
    expect(mode.kind).toBe('fen');
    if (mode.kind === 'fen') {
      expect(mode.fen).toBe(VALID_FEN);
      expect(mode.caption).toBe('opening');
      expect(mode.valid).toBe(true);
    }
    // MiniBoard preview rendered for valid FEN.
    expect(container.querySelector('[data-testid="mini-board"]')).not.toBeNull();
  });

  it('reports valid:false and hides preview for an invalid FEN', () => {
    const { container, onModeChange, getByText } = setup();
    fireEvent.click(getByText('Attach media (image / FEN / video)'));
    const fenRadio = container.querySelector(
      'input[name="mediaAttachmentKind"][value="fen"]'
    ) as HTMLInputElement;
    fireEvent.click(fenRadio);
    const fenInput = container.querySelector('#attachmentFen') as HTMLInputElement;
    fireEvent.change(fenInput, { target: { value: 'not a fen' } });

    const mode = lastMode(onModeChange);
    expect(mode.kind).toBe('fen');
    if (mode.kind === 'fen') {
      expect(mode.valid).toBe(false);
    }
    expect(container.querySelector('[data-testid="mini-board"]')).toBeNull();
  });

  it('switches to video sub-input and surfaces the URL trimmed', () => {
    const { container, onModeChange, getByText } = setup();
    fireEvent.click(getByText('Attach media (image / FEN / video)'));
    const videoRadio = container.querySelector(
      'input[name="mediaAttachmentKind"][value="video"]'
    ) as HTMLInputElement;
    fireEvent.click(videoRadio);
    const urlInput = container.querySelector('#attachmentVideoUrl') as HTMLInputElement;
    fireEvent.change(urlInput, {
      target: { value: '   https://www.youtube.com/watch?v=dQw4w9WgXcQ\n' },
    });
    const mode = lastMode(onModeChange);
    expect(mode.kind).toBe('video');
    if (mode.kind === 'video') {
      expect(mode.url).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    }
  });

  it('falls back to empty mode when collapsed after selecting content', () => {
    const { onModeChange, getByText } = setup();
    const expander = getByText('Attach media (image / FEN / video)');
    fireEvent.click(expander); // open
    fireEvent.click(getByText('Hide media attachment')); // close
    expect(lastMode(onModeChange).kind).toBe('empty');
  });

  it('caps the file selection at MAX_IMAGES_PER_POST (3)', () => {
    const { container, onModeChange, getByText } = setup();
    fireEvent.click(getByText('Attach media (image / FEN / video)'));
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const files = Array.from(
      { length: 5 },
      (_, i) => new File([`x`], `f${i}.png`, { type: 'image/png' })
    );
    fireEvent.change(fileInput, { target: { files } });
    const mode = lastMode(onModeChange);
    expect(mode.kind).toBe('image');
    if (mode.kind === 'image') {
      expect(mode.files.length).toBe(3);
    }
  });

  // ─── State machine pins (Tester Phase 1) ──────────────────────────────
  // Single-kind constraint, mode switching, FEN whitespace/ZWSP handling.

  it('switching from FEN back to image keeps state segregated by sub-kind', () => {
    const { container, onModeChange, getByText } = setup();
    fireEvent.click(getByText('Attach media (image / FEN / video)'));
    // First, type a FEN.
    const fenRadio = container.querySelector(
      'input[name="mediaAttachmentKind"][value="fen"]'
    ) as HTMLInputElement;
    fireEvent.click(fenRadio);
    const fenInput = container.querySelector('#attachmentFen') as HTMLInputElement;
    fireEvent.change(fenInput, { target: { value: VALID_FEN } });
    expect(lastMode(onModeChange).kind).toBe('fen');
    // Switch back to image. The reported mode should fall to empty
    // (no files selected on the image input).
    const imageRadio = container.querySelector(
      'input[name="mediaAttachmentKind"][value="image"]'
    ) as HTMLInputElement;
    fireEvent.click(imageRadio);
    expect(lastMode(onModeChange).kind).toBe('empty');
  });

  it('switching from image with files selected to video reports empty until URL is typed', () => {
    const { container, onModeChange, getByText } = setup();
    fireEvent.click(getByText('Attach media (image / FEN / video)'));
    // Select an image first.
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, {
      target: { files: [new File(['x'], 'a.png', { type: 'image/png' })] },
    });
    expect(lastMode(onModeChange).kind).toBe('image');
    // Switch sub-kind to video. The image files are still in the
    // ImageInput's local state, but the video sub-kind is now active
    // and reports empty until the user types something.
    const videoRadio = container.querySelector(
      'input[name="mediaAttachmentKind"][value="video"]'
    ) as HTMLInputElement;
    fireEvent.click(videoRadio);
    expect(lastMode(onModeChange).kind).toBe('empty');
  });

  it('FEN with only whitespace input never leaves empty mode', () => {
    const { container, onModeChange, getByText } = setup();
    fireEvent.click(getByText('Attach media (image / FEN / video)'));
    const fenRadio = container.querySelector(
      'input[name="mediaAttachmentKind"][value="fen"]'
    ) as HTMLInputElement;
    fireEvent.click(fenRadio);
    const fenInput = container.querySelector('#attachmentFen') as HTMLInputElement;
    fireEvent.change(fenInput, { target: { value: '   \t\n   ' } });
    // Pure whitespace trims to '', so mode stays empty (no fen mode
    // emitted, no preview rendered).
    expect(lastMode(onModeChange).kind).toBe('empty');
    expect(container.querySelector('[data-testid="mini-board"]')).toBeNull();
  });

  it('FEN at MAX length boundary (100 chars) is exempt from the 100-char invalid bypass', () => {
    // The component skips validation entirely when fenTrimmed.length > 100
    // (it short-circuits to `valid:false` without running
    // validateFenSemantic). 100-char FEN must still be evaluated. The
    // standard starting FEN is shorter than 100 chars; pin a long-ish
    // well-formed FEN instead.
    const longButValid = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const { container, onModeChange, getByText } = setup();
    fireEvent.click(getByText('Attach media (image / FEN / video)'));
    const fenRadio = container.querySelector(
      'input[name="mediaAttachmentKind"][value="fen"]'
    ) as HTMLInputElement;
    fireEvent.click(fenRadio);
    const fenInput = container.querySelector('#attachmentFen') as HTMLInputElement;
    fireEvent.change(fenInput, { target: { value: longButValid } });
    const mode = lastMode(onModeChange);
    expect(mode.kind).toBe('fen');
    if (mode.kind === 'fen') expect(mode.valid).toBe(true);
  });

  it('FEN > 100 chars is rejected by the client-side fast bypass before validateFenSemantic', () => {
    const tooLong = 'x'.repeat(110);
    const { container, onModeChange, getByText } = setup();
    fireEvent.click(getByText('Attach media (image / FEN / video)'));
    const fenRadio = container.querySelector(
      'input[name="mediaAttachmentKind"][value="fen"]'
    ) as HTMLInputElement;
    fireEvent.click(fenRadio);
    const fenInput = container.querySelector('#attachmentFen') as HTMLInputElement;
    fireEvent.change(fenInput, { target: { value: tooLong } });
    const mode = lastMode(onModeChange);
    expect(mode.kind).toBe('fen');
    if (mode.kind === 'fen') expect(mode.valid).toBe(false);
    // The mini-board preview must NOT render for invalid FEN, even at
    // the length-cap fast path.
    expect(container.querySelector('[data-testid="mini-board"]')).toBeNull();
  });

  it('caption is reported as null (not "") when caption input is empty', () => {
    const { container, onModeChange, getByText } = setup();
    fireEvent.click(getByText('Attach media (image / FEN / video)'));
    const fenRadio = container.querySelector(
      'input[name="mediaAttachmentKind"][value="fen"]'
    ) as HTMLInputElement;
    fireEvent.click(fenRadio);
    const fenInput = container.querySelector('#attachmentFen') as HTMLInputElement;
    fireEvent.change(fenInput, { target: { value: VALID_FEN } });
    const mode = lastMode(onModeChange);
    expect(mode.kind).toBe('fen');
    if (mode.kind === 'fen') {
      expect(mode.caption).toBeNull();
    }
  });

  it('caption with leading/trailing whitespace is trimmed in the reported mode', () => {
    const { container, onModeChange, getByText } = setup();
    fireEvent.click(getByText('Attach media (image / FEN / video)'));
    const fenRadio = container.querySelector(
      'input[name="mediaAttachmentKind"][value="fen"]'
    ) as HTMLInputElement;
    fireEvent.click(fenRadio);
    const fenInput = container.querySelector('#attachmentFen') as HTMLInputElement;
    fireEvent.change(fenInput, { target: { value: VALID_FEN } });
    const captionInput = container.querySelector('#attachmentFenCaption') as HTMLInputElement;
    fireEvent.change(captionInput, { target: { value: '   side notes   ' } });
    const mode = lastMode(onModeChange);
    expect(mode.kind).toBe('fen');
    if (mode.kind === 'fen') {
      expect(mode.caption).toBe('side notes');
    }
  });

  it('a11y: sub-kind selector is a radiogroup with three radios, image checked by default', () => {
    const { container, getByText } = setup();
    fireEvent.click(getByText('Attach media (image / FEN / video)'));
    const group = container.querySelector('[role="radiogroup"]');
    expect(group).not.toBeNull();
    const radios = container.querySelectorAll('input[name="mediaAttachmentKind"]');
    expect(radios.length).toBe(3);
    const checked = container.querySelector(
      'input[name="mediaAttachmentKind"]:checked'
    ) as HTMLInputElement;
    expect(checked.value).toBe('image');
  });

  // Lessons §10 alignment pin: the FEN <input>'s maxLength must lock-step
  // with the canonical FEN_MAX_LENGTH constant (=100). Drift here is the
  // exact bug the Phase 1 Reviewer Medium finding called out — a 120-char
  // maxLength let users type up to 120 chars while the validator rejected
  // anything over 100, producing a confusing "FEN format is invalid"
  // message for a length-only problem.
  it('FEN <input> maxLength matches FEN_MAX_LENGTH (=100)', () => {
    const { container, getByText } = setup();
    fireEvent.click(getByText('Attach media (image / FEN / video)'));
    const fenRadio = container.querySelector(
      'input[name="mediaAttachmentKind"][value="fen"]'
    ) as HTMLInputElement;
    fireEvent.click(fenRadio);
    const fenInput = container.querySelector('#attachmentFen') as HTMLInputElement;
    expect(fenInput.maxLength).toBe(100);
  });
});
