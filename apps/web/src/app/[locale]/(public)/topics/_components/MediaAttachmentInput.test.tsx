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
});
