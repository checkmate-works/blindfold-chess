import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NewPostForm } from './NewPostForm';

const mockCreateChunkPostWithFenAttachment = vi.fn();
const mockCreateChunkPostWithAttachment = vi.fn();

vi.mock('../_actions/createChunkPostWithFenAttachment', () => ({
  createChunkPostWithFenAttachment: (...args: unknown[]) =>
    mockCreateChunkPostWithFenAttachment(...args),
}));
vi.mock('../_actions/createChunkPostWithAttachment', () => ({
  createChunkPostWithAttachment: (...args: unknown[]) => mockCreateChunkPostWithAttachment(...args),
}));

// Stub MiniBoard so the FEN preview does not pull in the chess-piece icon stack.
vi.mock('@/lib/positions/ui/MiniBoard', () => ({
  MiniBoard: ({ fen }: { fen: string }) => <div data-testid="mini-board" data-fen={fen} />,
}));

// Pass-through translator: returns the key verbatim. `has()` reports
// every key as known so BasePostForm's error-message resolution
// short-circuits to `t(state.error)` (which equals the original
// error key) instead of falling back to the generic 'error' key.
// Test expectations therefore match against the raw error key
// (e.g. 'rate_limited', 'postFenAttachment.error.alreadyAttached').
vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: () => {
    const t = (key: string) => key;
    t.has = (_key: string) => true;
    return t;
  },
}));

vi.mock('next-navigation-guard', () => ({
  useNavigationGuard: () => ({
    active: false,
    accept: vi.fn(),
    reject: vi.fn(),
  }),
}));

// Make `useActionState` invoke the wrapped server action and
// reflect its resolved state back into the component so error
// messages flow through `<FormErrorBanner>`. `useTransition` is
// re-exported untouched.
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return {
    ...actual,
    useActionState: <S, P>(
      action: (state: S, payload: P) => Promise<S>,
      initialState: S
    ): [S, (payload: P) => void, boolean] => {
      const [state, setState] = actual.useState(initialState);
      const formAction = (payload: P) => {
        void Promise.resolve(action(state, payload)).then(setState);
      };
      return [state, formAction, false];
    },
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

const VALID_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const PGN_SAMPLE =
  '[Event "Test"]\n[Site "?"]\n[Date "2024.01.01"]\n[Round "?"]\n[White "A"]\n[Black "B"]\n[Result "1-0"]\n\n1. e4 e5 1-0';

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

    const content = container.querySelector('textarea[name="content"]') as HTMLTextAreaElement;
    fireEvent.change(content, { target: { value: 'just a plain comment' } });
    const form = container.querySelector('form') as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockCreateChunkPostWithAttachment).toHaveBeenCalledTimes(1);
    });
  });

  it('FEN attach via Position tab routes to createChunkPostWithFenAttachment with the canonical FEN', async () => {
    mockCreateChunkPostWithFenAttachment.mockResolvedValue({});
    const { container } = render(<NewPostForm locale="en" slug="rook-battery" />);

    openModal();
    fireEvent.click(getTab(1));
    const fenInput = document.querySelector('#attachmentFen') as HTMLInputElement;
    fireEvent.change(fenInput, { target: { value: `   ${VALID_FEN}   ` } });
    clickApply();

    const content = container.querySelector('textarea[name="content"]') as HTMLTextAreaElement;
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

    const content = container.querySelector('textarea[name="content"]') as HTMLTextAreaElement;
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

  it('plain comment error from Server Action surfaces and submit is re-enabled', async () => {
    mockCreateChunkPostWithAttachment.mockResolvedValue({ error: 'rate_limited' });
    const { container } = render(<NewPostForm locale="en" slug="rook-battery" />);
    const content = container.querySelector('textarea[name="content"]') as HTMLTextAreaElement;
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

describe('NewPostForm — Game tab routing via the modal (#84: PGN-only)', () => {
  it('PGN-shaped attachment text routes to createChunkPostWithAttachment with synthesized attachment field', async () => {
    mockCreateChunkPostWithAttachment.mockResolvedValue({});
    const { container } = render(<NewPostForm locale="en" slug="rook-battery" />);

    openModal();
    // Game tab is the default. #84 removes the PGN/URL sub-mode radio
    // so the PGN textarea is the only Game-tab input.
    const attachment = document.querySelector('#attachmentPgn') as HTMLTextAreaElement;
    fireEvent.change(attachment, { target: { value: PGN_SAMPLE } });
    clickApply();

    const content = container.querySelector('textarea[name="content"]') as HTMLTextAreaElement;
    fireEvent.change(content, { target: { value: 'see the game' } });
    const form = container.querySelector('form') as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockCreateChunkPostWithAttachment).toHaveBeenCalledTimes(1);
    });
    const fd = mockCreateChunkPostWithAttachment.mock.calls[0][3] as FormData;
    expect(fd.get('attachment')).toBe(PGN_SAMPLE);
  });

  function selectUrlSubMode() {
    const urlRadio = document.querySelector(
      'input[name="gameAttachmentKind"][value="url"]'
    ) as HTMLInputElement;
    fireEvent.click(urlRadio);
  }

  it('Lichess embed URL is forwarded as the raw `attachment` field via the URL sub-mode', async () => {
    mockCreateChunkPostWithAttachment.mockResolvedValue({});
    const { container } = render(<NewPostForm locale="en" slug="rook-battery" />);

    openModal();
    selectUrlSubMode();
    const url = 'https://lichess.org/embed/abcd1234';
    const urlInput = document.querySelector('#attachmentUrl') as HTMLInputElement;
    fireEvent.change(urlInput, { target: { value: url } });
    clickApply();

    const content = container.querySelector('textarea[name="content"]') as HTMLTextAreaElement;
    fireEvent.change(content, { target: { value: 'replay' } });
    const form = container.querySelector('form') as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockCreateChunkPostWithAttachment).toHaveBeenCalledTimes(1);
    });
    const fd = mockCreateChunkPostWithAttachment.mock.calls[0][3] as FormData;
    expect(fd.get('attachment')).toBe(url);
  });

  it('Lichess game URL is forwarded as the raw `attachment` field via the URL sub-mode', async () => {
    mockCreateChunkPostWithAttachment.mockResolvedValue({});
    const { container } = render(<NewPostForm locale="en" slug="rook-battery" />);

    openModal();
    selectUrlSubMode();
    const url = 'https://lichess.org/0zeJx5nICLsH';
    const urlInput = document.querySelector('#attachmentUrl') as HTMLInputElement;
    fireEvent.change(urlInput, { target: { value: url } });
    clickApply();

    const content = container.querySelector('textarea[name="content"]') as HTMLTextAreaElement;
    fireEvent.change(content, { target: { value: 'replay' } });
    const form = container.querySelector('form') as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockCreateChunkPostWithAttachment).toHaveBeenCalledTimes(1);
    });
    const fd = mockCreateChunkPostWithAttachment.mock.calls[0][3] as FormData;
    expect(fd.get('attachment')).toBe(url);
  });

  it('URL sub-mode rejects a chess.com /emboard URL and disables Apply', async () => {
    render(<NewPostForm locale="en" slug="rook-battery" />);

    openModal();
    selectUrlSubMode();
    const urlInput = document.querySelector('#attachmentUrl') as HTMLInputElement;
    fireEvent.change(urlInput, { target: { value: 'https://www.chess.com/emboard?id=12345' } });

    await waitFor(() => {
      const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
      expect(dialog.textContent).toMatch(/chess\.com URLs are not accepted/i);
    });

    const applyBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent === 'Apply'
    ) as HTMLButtonElement;
    expect(applyBtn.disabled).toBe(true);
  });
});

describe('NewPostForm — paperclip + counter row layout (Phase 7)', () => {
  it('renders the content character counter inline with the paperclip icon row, not below the textarea', () => {
    const { container } = render(<NewPostForm locale="en" slug="rook-battery" />);

    // The Textarea ships its own internal counter slot below the
    // textarea when `showCount` is unset; Phase 7 disables that and
    // re-renders the counter alongside the paperclip icon. The
    // resulting DOM should contain exactly one counter element with
    // the canonical `<current> / <max>` shape.
    const counters = Array.from(container.querySelectorAll('p')).filter((p) =>
      /^\s*\d[\d,]*\s*\/\s*\d[\d,]*\s*$/.test(p.textContent ?? '')
    );
    expect(counters.length).toBe(1);
    expect(counters[0].textContent).toBe('0 / 2,000');

    // The counter and the paperclip button must share a common flex
    // container — i.e. the paperclip's nearest flex ancestor must
    // also contain the counter.
    const paperclipButton = container.querySelector(
      'button[aria-label="Add attachment"]'
    ) as HTMLButtonElement;
    expect(paperclipButton).not.toBeNull();
    let row: HTMLElement | null = paperclipButton.parentElement;
    while (row && !(row.classList.contains('flex') && row.contains(counters[0]))) {
      row = row.parentElement;
    }
    expect(row).not.toBeNull();
    expect(row?.contains(counters[0])).toBe(true);
    expect(row?.contains(paperclipButton)).toBe(true);
  });

  it('updates the counter as the user types into the content textarea', () => {
    const { container } = render(<NewPostForm locale="en" slug="rook-battery" />);

    const content = container.querySelector('textarea[name="content"]') as HTMLTextAreaElement;
    fireEvent.change(content, { target: { value: 'hello' } });

    const counters = Array.from(container.querySelectorAll('p')).filter((p) =>
      /^\s*\d[\d,]*\s*\/\s*\d[\d,]*\s*$/.test(p.textContent ?? '')
    );
    expect(counters.length).toBe(1);
    expect(counters[0].textContent).toBe('5 / 2,000');
  });
});

describe('NewPostForm — single-kind structural guarantee (D3 case iii)', () => {
  it('two tabs filled, only the active tab’s mode is applied so submit routes one Server Action', async () => {
    mockCreateChunkPostWithFenAttachment.mockResolvedValue({});
    const { container } = render(<NewPostForm locale="en" slug="rook-battery" />);

    openModal();
    // Game tab: PGN textarea inline.
    const attachment = document.querySelector('#attachmentPgn') as HTMLTextAreaElement;
    fireEvent.change(attachment, { target: { value: PGN_SAMPLE } });
    // Switch to Position tab and enter a FEN — the active tab on Apply.
    fireEvent.click(getTab(1));
    const fenInput = document.querySelector('#attachmentFen') as HTMLInputElement;
    fireEvent.change(fenInput, { target: { value: VALID_FEN } });
    clickApply();

    const content = container.querySelector('textarea[name="content"]') as HTMLTextAreaElement;
    fireEvent.change(content, { target: { value: 'two-kind input' } });
    const form = container.querySelector('form') as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockCreateChunkPostWithFenAttachment).toHaveBeenCalledTimes(1);
    });
    expect(mockCreateChunkPostWithAttachment).not.toHaveBeenCalled();
  });
});
