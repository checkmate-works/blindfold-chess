import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FenAttachmentInput } from './FenAttachmentInput';
import type { FenAttachmentMode } from './FenAttachmentInput';
import type { ValidationStatus } from './attachment-validation-status';

vi.mock('@/lib/positions/ui/MiniBoard', () => ({
  MiniBoard: ({ fen }: { fen: string }) => <div data-testid="mini-board" data-fen={fen} />,
}));

const VALID_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function setup() {
  const onModeChange = vi.fn<(mode: FenAttachmentMode) => void>();
  const onChange = vi.fn<(hasContent: boolean) => void>();
  const result = render(<FenAttachmentInput onChange={onChange} onModeChange={onModeChange} />);
  return { onModeChange, onChange, ...result };
}

function lastMode(onModeChange: ReturnType<typeof vi.fn>): FenAttachmentMode {
  const calls = onModeChange.mock.calls;
  return calls[calls.length - 1]?.[0] as FenAttachmentMode;
}

describe('FenAttachmentInput', () => {
  it('renders the FEN input and caption input with the contract ids', () => {
    setup();
    expect(document.querySelector('#attachmentFen')).not.toBeNull();
    expect(document.querySelector('#attachmentFenCaption')).not.toBeNull();
  });

  it('reports empty mode initially', () => {
    const { onModeChange } = setup();
    expect(lastMode(onModeChange).kind).toBe('empty');
  });

  it('reports a fen mode with valid=true and trimmed FEN when the input is valid', () => {
    const { onModeChange, onChange } = setup();
    const input = document.querySelector('#attachmentFen') as HTMLInputElement;
    fireEvent.change(input, { target: { value: `   ${VALID_FEN}   ` } });
    const mode = lastMode(onModeChange);
    expect(mode.kind).toBe('fen');
    if (mode.kind === 'fen') {
      expect(mode.fen).toBe(VALID_FEN);
      expect(mode.valid).toBe(true);
      expect(mode.caption).toBeNull();
    }
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('reports valid=false when the FEN is malformed and shows the invalid hint', () => {
    const { onModeChange, container } = setup();
    const input = document.querySelector('#attachmentFen') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'not a fen' } });
    const mode = lastMode(onModeChange);
    expect(mode.kind).toBe('fen');
    if (mode.kind === 'fen') {
      expect(mode.valid).toBe(false);
    }
    expect(container.textContent).toMatch(/FEN format is invalid/i);
  });

  it('hides the MiniBoard preview while the FEN is invalid', () => {
    setup();
    const input = document.querySelector('#attachmentFen') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'not a fen' } });
    expect(document.querySelector('[data-testid="mini-board"]')).toBeNull();
  });

  it('shows the MiniBoard preview once the FEN is valid', () => {
    setup();
    const input = document.querySelector('#attachmentFen') as HTMLInputElement;
    fireEvent.change(input, { target: { value: VALID_FEN } });
    const board = document.querySelector('[data-testid="mini-board"]') as HTMLElement;
    expect(board).not.toBeNull();
    expect(board.getAttribute('data-fen')).toBe(VALID_FEN);
  });

  it('emits the trimmed caption when one is provided', () => {
    const { onModeChange } = setup();
    const fen = document.querySelector('#attachmentFen') as HTMLInputElement;
    fireEvent.change(fen, { target: { value: VALID_FEN } });
    const cap = document.querySelector('#attachmentFenCaption') as HTMLInputElement;
    fireEvent.change(cap, { target: { value: '  starting position  ' } });
    const mode = lastMode(onModeChange);
    expect(mode.kind).toBe('fen');
    if (mode.kind === 'fen') {
      expect(mode.caption).toBe('starting position');
    }
  });

  it('emits caption=null when the caption is whitespace-only', () => {
    const { onModeChange } = setup();
    const fen = document.querySelector('#attachmentFen') as HTMLInputElement;
    fireEvent.change(fen, { target: { value: VALID_FEN } });
    const cap = document.querySelector('#attachmentFenCaption') as HTMLInputElement;
    fireEvent.change(cap, { target: { value: '   ' } });
    const mode = lastMode(onModeChange);
    expect(mode.kind).toBe('fen');
    if (mode.kind === 'fen') {
      expect(mode.caption).toBeNull();
    }
  });

  it('returns to empty mode when the FEN is cleared after typing', () => {
    const { onModeChange, onChange } = setup();
    const input = document.querySelector('#attachmentFen') as HTMLInputElement;
    fireEvent.change(input, { target: { value: VALID_FEN } });
    expect(lastMode(onModeChange).kind).toBe('fen');
    fireEvent.change(input, { target: { value: '' } });
    expect(lastMode(onModeChange).kind).toBe('empty');
    // onChange was called with true (after typing) and then false (after clearing).
    const calls = onChange.mock.calls.map((c) => c[0]);
    expect(calls.includes(true)).toBe(true);
    expect(calls[calls.length - 1]).toBe(false);
  });

  it('whitespace-only FEN reports empty (not an invalid fen)', () => {
    const { onModeChange, container } = setup();
    const input = document.querySelector('#attachmentFen') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '     ' } });
    expect(lastMode(onModeChange).kind).toBe('empty');
    expect(container.textContent).not.toMatch(/FEN format is invalid/i);
  });
});

describe('FenAttachmentInput — onValidationStatusChange', () => {
  function setupWithStatus() {
    const onValidationStatusChange = vi.fn<(status: ValidationStatus) => void>();
    const result = render(
      <FenAttachmentInput onValidationStatusChange={onValidationStatusChange} />
    );
    return { onValidationStatusChange, ...result };
  }

  function lastStatus(fn: ReturnType<typeof vi.fn>): ValidationStatus {
    const calls = fn.mock.calls;
    return calls[calls.length - 1]?.[0] as ValidationStatus;
  }

  it('reports empty initially', () => {
    const { onValidationStatusChange } = setupWithStatus();
    expect(lastStatus(onValidationStatusChange)).toBe('empty');
  });

  it('reports ok when the FEN parses', () => {
    const { onValidationStatusChange } = setupWithStatus();
    const input = document.querySelector('#attachmentFen') as HTMLInputElement;
    fireEvent.change(input, { target: { value: VALID_FEN } });
    expect(lastStatus(onValidationStatusChange)).toBe('ok');
  });

  it('reports error when the FEN is malformed', () => {
    const { onValidationStatusChange } = setupWithStatus();
    const input = document.querySelector('#attachmentFen') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'not a fen' } });
    expect(lastStatus(onValidationStatusChange)).toBe('error');
  });

  it('returns to empty when the FEN is cleared', () => {
    const { onValidationStatusChange } = setupWithStatus();
    const input = document.querySelector('#attachmentFen') as HTMLInputElement;
    fireEvent.change(input, { target: { value: VALID_FEN } });
    fireEvent.change(input, { target: { value: '' } });
    expect(lastStatus(onValidationStatusChange)).toBe('empty');
  });
});
