import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NewPostForm } from './NewPostForm';

const mockRouterPush = vi.fn();
const mockRouterRefresh = vi.fn();
const mockCreateChunkPostForImageAttach = vi.fn();
const mockCreateChunkPostWithFenAttachment = vi.fn();
const mockCreateChunkPostWithVideoAttachment = vi.fn();
const mockCreateChunkPostWithAttachment = vi.fn();

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

// Stub MiniBoard so MediaAttachmentInput's FEN preview does not pull in
// the chess-piece icon stack.
vi.mock('@/lib/positions/ui/MiniBoard', () => ({
  MiniBoard: ({ fen }: { fen: string }) => <div data-testid="mini-board" data-fen={fen} />,
}));

// Stub a fetch global so the image upload step can be observed.
const fetchMock = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  // Default: a successful image upload.
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
  globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;
});

afterEach(() => {
  cleanup();
});

const VALID_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('NewPostForm — Media attachment integration', () => {
  it('plain comment routes through createChunkPostWithAttachment', async () => {
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

  it('FEN attach routes to createChunkPostWithFenAttachment with the canonical FEN', async () => {
    mockCreateChunkPostWithFenAttachment.mockResolvedValue({});
    const { container, getByText } = render(<NewPostForm locale="en" slug="rook-battery" />);

    fireEvent.click(getByText('Attach media (image / FEN / video)'));
    const fenRadio = container.querySelector(
      'input[name="mediaAttachmentKind"][value="fen"]'
    ) as HTMLInputElement;
    fireEvent.click(fenRadio);
    const fenInput = container.querySelector('#attachmentFen') as HTMLInputElement;
    fireEvent.change(fenInput, { target: { value: `   ${VALID_FEN}   ` } });

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

  it('blocks submit while an invalid FEN is entered', () => {
    const { container, getByText } = render(<NewPostForm locale="en" slug="rook-battery" />);
    fireEvent.click(getByText('Attach media (image / FEN / video)'));
    const fenRadio = container.querySelector(
      'input[name="mediaAttachmentKind"][value="fen"]'
    ) as HTMLInputElement;
    fireEvent.click(fenRadio);
    const fenInput = container.querySelector('#attachmentFen') as HTMLInputElement;
    fireEvent.change(fenInput, { target: { value: 'not a fen' } });

    // The submit button is disabled while the FEN sub-input is in an
    // invalid state.
    const button = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('video attach routes to createChunkPostWithVideoAttachment with the trimmed URL', async () => {
    mockCreateChunkPostWithVideoAttachment.mockResolvedValue({});
    const { container, getByText } = render(<NewPostForm locale="en" slug="rook-battery" />);
    fireEvent.click(getByText('Attach media (image / FEN / video)'));
    const videoRadio = container.querySelector(
      'input[name="mediaAttachmentKind"][value="video"]'
    ) as HTMLInputElement;
    fireEvent.click(videoRadio);
    const urlInput = container.querySelector('#attachmentVideoUrl') as HTMLInputElement;
    fireEvent.change(urlInput, {
      target: { value: '   https://www.youtube.com/watch?v=dQw4w9WgXcQ\n' },
    });
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
    const { container, getByText } = render(<NewPostForm locale="en" slug="rook-battery" />);
    fireEvent.click(getByText('Attach media (image / FEN / video)'));
    // image is the default sub-kind
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file1 = new File(['x'], 'a.png', { type: 'image/png' });
    const file2 = new File(['x'], 'b.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file1, file2] } });

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

  it('image attach surfaces an upload error but does not roll back the post', async () => {
    mockCreateChunkPostForImageAttach.mockResolvedValue({ ok: true, postId: 'p-002' });
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'upload_failed' }),
    });

    const { container, getByText } = render(<NewPostForm locale="en" slug="rook-battery" />);
    fireEvent.click(getByText('Attach media (image / FEN / video)'));
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], 'a.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    const content = container.querySelector('#content') as HTMLTextAreaElement;
    fireEvent.change(content, { target: { value: 'with images' } });
    const form = container.querySelector('form') as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockCreateChunkPostForImageAttach).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    // Post was created (mockCreateChunkPostForImageAttach returned ok),
    // but no router.push happened — the form stays so the user can react.
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  // ─── Phase machine + single-kind constraint pins (Tester Phase 1) ─────

  it('FEN error returned by Server Action is surfaced via FormErrorBanner', async () => {
    mockCreateChunkPostWithFenAttachment.mockResolvedValue({
      error: 'postFenAttachment.error.alreadyAttached',
    });
    const { container, getByText } = render(<NewPostForm locale="en" slug="rook-battery" />);
    fireEvent.click(getByText('Attach media (image / FEN / video)'));
    const fenRadio = container.querySelector(
      'input[name="mediaAttachmentKind"][value="fen"]'
    ) as HTMLInputElement;
    fireEvent.click(fenRadio);
    const fenInput = container.querySelector('#attachmentFen') as HTMLInputElement;
    fireEvent.change(fenInput, { target: { value: VALID_FEN } });
    const content = container.querySelector('#content') as HTMLTextAreaElement;
    fireEvent.change(content, { target: { value: 'see the position' } });
    const form = container.querySelector('form') as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockCreateChunkPostWithFenAttachment).toHaveBeenCalledTimes(1);
    });
    // FormErrorBanner renders the error key text or its translation.
    await waitFor(() => {
      expect(container.textContent).toMatch(/postFenAttachment\.error\.alreadyAttached/);
    });
  });

  it('Video error returned by Server Action is surfaced and submit becomes available again', async () => {
    mockCreateChunkPostWithVideoAttachment.mockResolvedValue({
      error: 'postVideoAttachment.error.hostNotAllowed',
    });
    const { container, getByText } = render(<NewPostForm locale="en" slug="rook-battery" />);
    fireEvent.click(getByText('Attach media (image / FEN / video)'));
    const videoRadio = container.querySelector(
      'input[name="mediaAttachmentKind"][value="video"]'
    ) as HTMLInputElement;
    fireEvent.click(videoRadio);
    const urlInput = container.querySelector('#attachmentVideoUrl') as HTMLInputElement;
    fireEvent.change(urlInput, { target: { value: 'https://vimeo.com/12345' } });
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
    // After error, submit must be re-enabled (submitting=false again).
    const button = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(button.disabled).toBe(false);
  });

  it('image partial-failure path shows the partial-upload hint and does NOT push the router', async () => {
    mockCreateChunkPostForImageAttach.mockResolvedValue({ ok: true, postId: 'p-003' });
    // First file uploads OK, second fails.
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'upload_failed' }) });

    const { container, getByText } = render(<NewPostForm locale="en" slug="rook-battery" />);
    fireEvent.click(getByText('Attach media (image / FEN / video)'));
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const f1 = new File(['x'], 'a.png', { type: 'image/png' });
    const f2 = new File(['x'], 'b.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [f1, f2] } });
    const content = container.querySelector('#content') as HTMLTextAreaElement;
    fireEvent.change(content, { target: { value: 'with images' } });
    const form = container.querySelector('form') as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
    // The partial-upload hint is rendered when imagePhase === 'error'
    // and createdPostId !== null.
    await waitFor(() => {
      expect(container.textContent).toMatch(/comment was posted but image upload failed/i);
    });
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('plain comment error from Server Action surfaces the error and submit is re-enabled', async () => {
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

  it('FEN attach: when invalid mode reaches submit (race), action is not called', async () => {
    // Pin the front-line guard: mediaMode.valid===false short-circuits
    // before calling createChunkPostWithFenAttachment, even if (somehow)
    // the submit fires while the FEN sub-input still reports invalid.
    const { container, getByText } = render(<NewPostForm locale="en" slug="rook-battery" />);
    fireEvent.click(getByText('Attach media (image / FEN / video)'));
    const fenRadio = container.querySelector(
      'input[name="mediaAttachmentKind"][value="fen"]'
    ) as HTMLInputElement;
    fireEvent.click(fenRadio);
    const fenInput = container.querySelector('#attachmentFen') as HTMLInputElement;
    fireEvent.change(fenInput, { target: { value: 'not a fen' } });
    const content = container.querySelector('#content') as HTMLTextAreaElement;
    fireEvent.change(content, { target: { value: 'see the position' } });
    // Try to submit even though button is disabled — fireEvent.submit
    // bypasses the button disabled check.
    const form = container.querySelector('form') as HTMLFormElement;
    fireEvent.submit(form);
    // The action must not be invoked because submit() short-circuits
    // on `mediaMode.valid === false`.
    await new Promise((r) => setTimeout(r, 30));
    expect(mockCreateChunkPostWithFenAttachment).not.toHaveBeenCalled();
    // The validation error banner should appear instead.
    await waitFor(() => {
      expect(container.textContent).toMatch(/postFenAttachment\.error\.invalidFenStructure/);
    });
  });
});
