import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NewPostForm } from './NewPostForm';

const mockRouterPush = vi.fn();
const mockRouterRefresh = vi.fn();
const mockCreateChunkPostForImageAttach = vi.fn();
const mockCreateChunkPostWithFenAttachment = vi.fn();
const mockCreateChunkPostWithVideoAttachment = vi.fn();
const mockCreateChunkPostWithAttachment = vi.fn();
const mockCreateChunkPostWithEmbedAttachment = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    refresh: mockRouterRefresh,
  }),
}));

vi.mock('../_actions/createChunkPostForImageAttach', () => ({
  createChunkPostForImageAttach: (...args: unknown[]) => mockCreateChunkPostForImageAttach(...args),
}));
vi.mock('../_actions/createChunkPostWithFenAttachment', () => ({
  createChunkPostWithFenAttachment: (...args: unknown[]) =>
    mockCreateChunkPostWithFenAttachment(...args),
}));
vi.mock('../_actions/createChunkPostWithVideoAttachment', () => ({
  createChunkPostWithVideoAttachment: (...args: unknown[]) =>
    mockCreateChunkPostWithVideoAttachment(...args),
}));
vi.mock('../_actions/createChunkPostWithAttachment', () => ({
  createChunkPostWithAttachment: (...args: unknown[]) => mockCreateChunkPostWithAttachment(...args),
}));
vi.mock('../_actions/createChunkPostWithEmbedAttachment', () => ({
  createChunkPostWithEmbedAttachment: (...args: unknown[]) =>
    mockCreateChunkPostWithEmbedAttachment(...args),
}));

// Stub MiniBoard so the FEN preview does not pull in the chess-piece icon stack.
vi.mock('@/lib/positions/ui/MiniBoard', () => ({
  MiniBoard: ({ fen }: { fen: string }) => <div data-testid="mini-board" data-fen={fen} />,
}));

const fetchMock = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
  globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;
});

afterEach(() => {
  cleanup();
});

const VALID_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const PGN_SAMPLE =
  '[Event "Test"]\n[Site "?"]\n[Date "2024.01.01"]\n[Round "?"]\n[White "A"]\n[Black "B"]\n[Result "1-0"]\n\n1. e4 e5 1-0';
const LICHESS_EMBED_URL = 'https://lichess.org/embed/abcd1234';
const CHESSCOM_EMBED_URL = 'https://www.chess.com/emboard?id=12345';

function openModal() {
  const openBtn = Array.from(document.querySelectorAll('button')).find((b) => {
    const label = b.getAttribute('aria-label');
    return label === 'Add attachment' || label === 'Edit attachment';
  }) as HTMLButtonElement;
  fireEvent.click(openBtn);
}

function clickApply() {
  const applyBtn = Array.from(document.querySelectorAll('button')).find(
    (b) => b.textContent === 'Apply'
  ) as HTMLButtonElement;
  fireEvent.click(applyBtn);
}

function getTab(index: number) {
  return document.querySelectorAll('[role="tab"]')[index] as HTMLButtonElement;
}

describe('NewPostForm — modal-driven attachment routing', () => {
  it('plain comment with no attachment routes to createChunkPostWithAttachment', async () => {
    mockCreateChunkPostWithAttachment.mockResolvedValue({});
    const { container } = render(<NewPostForm locale="en" slug="rook-battery" />);

    const content = container.querySelector('#content') as HTMLTextAreaElement;
    fireEvent.change(content, { target: { value: 'just a plain comment' } });
    const form = container.querySelector('form') as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockCreateChunkPostWithAttachment).toHaveBeenCalledTimes(1);
    });
    expect(mockCreateChunkPostForImageAttach).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('FEN attach via Position tab routes to createChunkPostWithFenAttachment with the canonical FEN', async () => {
    mockCreateChunkPostWithFenAttachment.mockResolvedValue({});
    const { container } = render(<NewPostForm locale="en" slug="rook-battery" />);

    openModal();
    fireEvent.click(getTab(1));
    const fenInput = document.querySelector('#attachmentFen') as HTMLInputElement;
    fireEvent.change(fenInput, { target: { value: `   ${VALID_FEN}   ` } });
    clickApply();

    const content = container.querySelector('#content') as HTMLTextAreaElement;
    fireEvent.change(content, { target: { value: 'see the position' } });
    const form = container.querySelector('form') as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockCreateChunkPostWithFenAttachment).toHaveBeenCalledTimes(1);
    });
    const fd = mockCreateChunkPostWithFenAttachment.mock.calls[0][3] as FormData;
    expect(fd.get('attachmentFen')).toBe(VALID_FEN);
  });

  it('invalid FEN keeps Apply disabled inside the modal', () => {
    render(<NewPostForm locale="en" slug="rook-battery" />);
    openModal();
    fireEvent.click(getTab(1));
    const fenInput = document.querySelector('#attachmentFen') as HTMLInputElement;
    fireEvent.change(fenInput, { target: { value: 'not a fen' } });
    const applyBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent === 'Apply'
    ) as HTMLButtonElement;
    expect(applyBtn.disabled).toBe(true);
  });

  it('video attach via Media tab routes to createChunkPostWithVideoAttachment with the trimmed URL', async () => {
    mockCreateChunkPostWithVideoAttachment.mockResolvedValue({});
    const { container } = render(<NewPostForm locale="en" slug="rook-battery" />);

    openModal();
    fireEvent.click(getTab(2));
    const videoRadio = document.querySelector(
      'input[name="mediaAttachmentKind"][value="video"]'
    ) as HTMLInputElement;
    fireEvent.click(videoRadio);
    const urlInput = document.querySelector('#attachmentVideoUrl') as HTMLInputElement;
    fireEvent.change(urlInput, {
      target: { value: '   https://www.youtube.com/watch?v=dQw4w9WgXcQ\n' },
    });
    clickApply();

    const content = container.querySelector('#content') as HTMLTextAreaElement;
    fireEvent.change(content, { target: { value: 'lecture clip' } });
    const form = container.querySelector('form') as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockCreateChunkPostWithVideoAttachment).toHaveBeenCalledTimes(1);
    });
    const fd = mockCreateChunkPostWithVideoAttachment.mock.calls[0][3] as FormData;
    expect(fd.get('attachmentVideoUrl')).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  });

  it('image attach drives the 2-step flow and POSTs each file to /api/posts/[id]/images', async () => {
    mockCreateChunkPostForImageAttach.mockResolvedValue({ ok: true, postId: 'p-001' });
    const { container } = render(<NewPostForm locale="en" slug="rook-battery" />);

    openModal();
    fireEvent.click(getTab(2));
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file1 = new File(['x'], 'a.png', { type: 'image/png' });
    const file2 = new File(['x'], 'b.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file1, file2] } });
    clickApply();

    const content = container.querySelector('#content') as HTMLTextAreaElement;
    fireEvent.change(content, { target: { value: 'with images' } });
    const form = container.querySelector('form') as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockCreateChunkPostForImageAttach).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/posts/p-001/images');
    expect(fetchMock.mock.calls[1][0]).toBe('/api/posts/p-001/images');
    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/en/chunks/rook-battery#post-p-001');
    });
  });

  it('image upload partial failure surfaces the partial-upload hint and does NOT push the router', async () => {
    mockCreateChunkPostForImageAttach.mockResolvedValue({ ok: true, postId: 'p-003' });
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'upload_failed' }) });

    const { container } = render(<NewPostForm locale="en" slug="rook-battery" />);
    openModal();
    fireEvent.click(getTab(2));
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const f1 = new File(['x'], 'a.png', { type: 'image/png' });
    const f2 = new File(['x'], 'b.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [f1, f2] } });
    clickApply();

    const content = container.querySelector('#content') as HTMLTextAreaElement;
    fireEvent.change(content, { target: { value: 'with images' } });
    const form = container.querySelector('form') as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(container.textContent).toMatch(/comment was posted but image upload failed/i);
    });
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('FEN error returned by Server Action surfaces via FormErrorBanner', async () => {
    mockCreateChunkPostWithFenAttachment.mockResolvedValue({
      error: 'postFenAttachment.error.alreadyAttached',
    });
    const { container } = render(<NewPostForm locale="en" slug="rook-battery" />);
    openModal();
    fireEvent.click(getTab(1));
    const fenInput = document.querySelector('#attachmentFen') as HTMLInputElement;
    fireEvent.change(fenInput, { target: { value: VALID_FEN } });
    clickApply();

    const content = container.querySelector('#content') as HTMLTextAreaElement;
    fireEvent.change(content, { target: { value: 'see the position' } });
    const form = container.querySelector('form') as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockCreateChunkPostWithFenAttachment).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(container.textContent).toMatch(/postFenAttachment\.error\.alreadyAttached/);
    });
  });

  it('Video error returned by Server Action is surfaced and submit becomes available again', async () => {
    mockCreateChunkPostWithVideoAttachment.mockResolvedValue({
      error: 'postVideoAttachment.error.hostNotAllowed',
    });
    const { container } = render(<NewPostForm locale="en" slug="rook-battery" />);
    openModal();
    fireEvent.click(getTab(2));
    const videoRadio = document.querySelector(
      'input[name="mediaAttachmentKind"][value="video"]'
    ) as HTMLInputElement;
    fireEvent.click(videoRadio);
    const urlInput = document.querySelector('#attachmentVideoUrl') as HTMLInputElement;
    fireEvent.change(urlInput, { target: { value: 'https://vimeo.com/12345' } });
    clickApply();

    const content = container.querySelector('#content') as HTMLTextAreaElement;
    fireEvent.change(content, { target: { value: 'lecture clip' } });
    const form = container.querySelector('form') as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockCreateChunkPostWithVideoAttachment).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(container.textContent).toMatch(/postVideoAttachment\.error\.hostNotAllowed/);
    });
    const button = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(button.disabled).toBe(false);
  });

  it('plain comment error from Server Action surfaces and submit is re-enabled', async () => {
    mockCreateChunkPostWithAttachment.mockResolvedValue({ error: 'rate_limited' });
    const { container } = render(<NewPostForm locale="en" slug="rook-battery" />);
    const content = container.querySelector('#content') as HTMLTextAreaElement;
    fireEvent.change(content, { target: { value: 'just a plain comment' } });
    const form = container.querySelector('form') as HTMLFormElement;
    fireEvent.submit(form);
    await waitFor(() => {
      expect(mockCreateChunkPostWithAttachment).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(container.textContent).toMatch(/rate_limited/);
    });
    const button = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(button.disabled).toBe(false);
  });
});

describe('NewPostForm — Game family routing via the modal', () => {
  it('PGN-shaped attachment text routes to createChunkPostWithAttachment with synthesized attachment field', async () => {
    mockCreateChunkPostWithAttachment.mockResolvedValue({});
    const { container } = render(<NewPostForm locale="en" slug="rook-battery" />);

    openModal();
    // Game tab is selected by default; the textarea is rendered inline.
    const attachment = document.querySelector('#attachment') as HTMLTextAreaElement;
    fireEvent.change(attachment, { target: { value: PGN_SAMPLE } });
    clickApply();

    const content = container.querySelector('#content') as HTMLTextAreaElement;
    fireEvent.change(content, { target: { value: 'see the game' } });
    const form = container.querySelector('form') as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockCreateChunkPostWithAttachment).toHaveBeenCalledTimes(1);
    });
    const fd = mockCreateChunkPostWithAttachment.mock.calls[0][3] as FormData;
    expect(fd.get('attachment')).toBe(PGN_SAMPLE);
    expect(mockCreateChunkPostWithEmbedAttachment).not.toHaveBeenCalled();
  });

  it('Lichess embed URL routes to createChunkPostWithEmbedAttachment with provider=lichess', async () => {
    mockCreateChunkPostWithEmbedAttachment.mockResolvedValue({});
    const { container } = render(<NewPostForm locale="en" slug="rook-battery" />);

    openModal();
    const attachment = document.querySelector('#attachment') as HTMLTextAreaElement;
    fireEvent.change(attachment, { target: { value: LICHESS_EMBED_URL } });
    clickApply();

    const content = container.querySelector('#content') as HTMLTextAreaElement;
    fireEvent.change(content, { target: { value: 'replay this' } });
    const form = container.querySelector('form') as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockCreateChunkPostWithEmbedAttachment).toHaveBeenCalledTimes(1);
    });
    const fd = mockCreateChunkPostWithEmbedAttachment.mock.calls[0][3] as FormData;
    expect(fd.get('embedProvider')).toBe('lichess');
    expect(fd.get('embedSourceUrl')).toBe(LICHESS_EMBED_URL);
    expect(mockCreateChunkPostWithAttachment).not.toHaveBeenCalled();
  });

  it('chess.com embed URL routes to createChunkPostWithEmbedAttachment with provider=chesscom', async () => {
    mockCreateChunkPostWithEmbedAttachment.mockResolvedValue({});
    const { container } = render(<NewPostForm locale="en" slug="rook-battery" />);

    openModal();
    const attachment = document.querySelector('#attachment') as HTMLTextAreaElement;
    fireEvent.change(attachment, { target: { value: CHESSCOM_EMBED_URL } });
    clickApply();

    const content = container.querySelector('#content') as HTMLTextAreaElement;
    fireEvent.change(content, { target: { value: 'replay this' } });
    const form = container.querySelector('form') as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockCreateChunkPostWithEmbedAttachment).toHaveBeenCalledTimes(1);
    });
    const fd = mockCreateChunkPostWithEmbedAttachment.mock.calls[0][3] as FormData;
    expect(fd.get('embedProvider')).toBe('chesscom');
    expect(fd.get('embedSourceUrl')).toBe(CHESSCOM_EMBED_URL);
  });
});

describe('NewPostForm — single-kind structural guarantee (D3 case iii)', () => {
  it('two tabs filled, only the active tab’s mode is applied so submit routes one Server Action', async () => {
    mockCreateChunkPostWithFenAttachment.mockResolvedValue({});
    const { container } = render(<NewPostForm locale="en" slug="rook-battery" />);

    openModal();
    // Game tab: PGN.
    const attachment = document.querySelector('#attachment') as HTMLTextAreaElement;
    fireEvent.change(attachment, { target: { value: PGN_SAMPLE } });
    // Switch to Position tab and enter a FEN.
    fireEvent.click(getTab(1));
    const fenInput = document.querySelector('#attachmentFen') as HTMLInputElement;
    fireEvent.change(fenInput, { target: { value: VALID_FEN } });
    clickApply();

    const content = container.querySelector('#content') as HTMLTextAreaElement;
    fireEvent.change(content, { target: { value: 'two-kind input' } });
    const form = container.querySelector('form') as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockCreateChunkPostWithFenAttachment).toHaveBeenCalledTimes(1);
    });
    expect(mockCreateChunkPostWithAttachment).not.toHaveBeenCalled();
  });
});
