import { STARTING_FEN } from '@blindfold-chess/features/chess-core/fen';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ButtonInput } from './ButtonInput';

// `ButtonInput` uses `useTranslations('buttonInput')` from next-intl. Mock it
// to return the key unchanged so we can target buttons by their deterministic
// `aria-label` attribute in assertions.
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// `ChessPiece` pulls in cross-platform icon packages that can be slow to load
// under jsdom; stub it with a trivial placeholder.
vi.mock('@/app/_components/chess/ChessPiece', () => ({
  ChessPiece: () => <span />,
}));

// `useGamePreferences` reads from context + localStorage. Provide a minimal
// stub returning the fields `ButtonInput` actually consumes.
vi.mock('@/app/[locale]/_contexts/GamePreferencesContext', () => ({
  useGamePreferences: () => ({
    preferences: { buttonInputPieceLabel: 'text' },
  }),
}));

// aria-label values that identify each interactive button exactly, matching
// the translation keys used inside `ButtonInput` (next-intl mock returns keys
// verbatim).
const PIECE_LABELS = ['piece.king', 'piece.queen', 'piece.rook', 'piece.bishop', 'piece.knight'];
const CAPTURE_LABEL = 'symbol.capture';
const ANNOTATION_LABELS = ['symbol.check', 'symbol.promotion', 'symbol.checkmate'];
const CASTLING_LABELS = ['castling.kingside', 'castling.queenside'];
const UTILITY_LABELS = ['action.backspace', 'action.clear'];
const SUBMIT_LABEL = 'action.submit';

describe('ButtonInput', () => {
  describe('disabled=true', () => {
    it('disables every interactive button', () => {
      render(<ButtonInput fen={STARTING_FEN} onSubmit={() => {}} disabled={true} />);

      for (const label of [
        ...PIECE_LABELS,
        CAPTURE_LABEL,
        ...ANNOTATION_LABELS,
        ...CASTLING_LABELS,
        ...UTILITY_LABELS,
        SUBMIT_LABEL,
      ]) {
        expect(screen.getByRole('button', { name: label })).toBeDisabled();
      }

      // Files (a–h) and ranks (1–8) are rendered via `CoordinateInput`, whose
      // buttons have only their visible character as accessible name.
      for (const file of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
        expect(screen.getByRole('button', { name: file })).toBeDisabled();
      }
      for (const rank of ['1', '2', '3', '4', '5', '6', '7', '8']) {
        expect(screen.getByRole('button', { name: rank })).toBeDisabled();
      }
    });
  });

  describe('disabled=false', () => {
    it('leaves piece, file, rank, annotation, castling, and utility buttons enabled', () => {
      render(<ButtonInput fen={STARTING_FEN} onSubmit={() => {}} disabled={false} />);

      for (const label of [
        ...PIECE_LABELS,
        CAPTURE_LABEL,
        ...ANNOTATION_LABELS,
        ...CASTLING_LABELS,
        ...UTILITY_LABELS,
      ]) {
        expect(screen.getByRole('button', { name: label })).not.toBeDisabled();
      }
      for (const file of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
        expect(screen.getByRole('button', { name: file })).not.toBeDisabled();
      }
      for (const rank of ['1', '2', '3', '4', '5', '6', '7', '8']) {
        expect(screen.getByRole('button', { name: rank })).not.toBeDisabled();
      }
    });

    it('disables the submit button while the move is incomplete (canSubmit=false)', () => {
      // With no input, `computeIsSubmittable` is false, so the submit button
      // is disabled by the `!canSubmit` half of its predicate even when
      // `disabled=false`.
      render(<ButtonInput fen={STARTING_FEN} onSubmit={() => {}} disabled={false} />);

      expect(screen.getByRole('button', { name: SUBMIT_LABEL })).toBeDisabled();
    });
  });

  // Regression guard for the puzzle-creator bug where clicking a piece, file,
  // rank, annotation, castling, or utility button in ButtonInput mode would
  // submit the surrounding `<form>`. Root cause was that CoordinateInput's
  // file/rank buttons omitted a `type` attribute, defaulting to `type="submit"`
  // in HTML. ButtonInput itself always set `type="button"` on its own buttons,
  // but CoordinateInput did not. This block asserts that none of the buttons
  // rendered by ButtonInput can submit a parent form.
  describe('does not submit a surrounding form', () => {
    function renderInForm() {
      const parentSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
      render(
        <form onSubmit={parentSubmit} data-testid="parent-form">
          <ButtonInput fen={STARTING_FEN} onSubmit={() => {}} disabled={false} />
        </form>
      );
      return parentSubmit;
    }

    it.each(PIECE_LABELS)('clicking piece button %s does not submit', (label) => {
      const parentSubmit = renderInForm();
      fireEvent.click(screen.getByRole('button', { name: label }));
      expect(parentSubmit).not.toHaveBeenCalled();
    });

    it('clicking the capture button does not submit', () => {
      const parentSubmit = renderInForm();
      fireEvent.click(screen.getByRole('button', { name: CAPTURE_LABEL }));
      expect(parentSubmit).not.toHaveBeenCalled();
    });

    it.each(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'])(
      'clicking file button %s does not submit',
      (file) => {
        const parentSubmit = renderInForm();
        fireEvent.click(screen.getByRole('button', { name: file }));
        expect(parentSubmit).not.toHaveBeenCalled();
      }
    );

    it.each(['1', '2', '3', '4', '5', '6', '7', '8'])(
      'clicking rank button %s does not submit',
      (rank) => {
        const parentSubmit = renderInForm();
        fireEvent.click(screen.getByRole('button', { name: rank }));
        expect(parentSubmit).not.toHaveBeenCalled();
      }
    );

    it.each(ANNOTATION_LABELS)('clicking annotation button %s does not submit', (label) => {
      const parentSubmit = renderInForm();
      fireEvent.click(screen.getByRole('button', { name: label }));
      expect(parentSubmit).not.toHaveBeenCalled();
    });

    it.each(CASTLING_LABELS)('clicking castling button %s does not submit', (label) => {
      const parentSubmit = renderInForm();
      fireEvent.click(screen.getByRole('button', { name: label }));
      expect(parentSubmit).not.toHaveBeenCalled();
    });

    it.each(UTILITY_LABELS)('clicking utility button %s does not submit', (label) => {
      const parentSubmit = renderInForm();
      fireEvent.click(screen.getByRole('button', { name: label }));
      expect(parentSubmit).not.toHaveBeenCalled();
    });

    it('every button rendered has an explicit type="button"', () => {
      render(<ButtonInput fen={STARTING_FEN} onSubmit={() => {}} disabled={false} />);
      const buttons = document.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(0);
      for (const btn of Array.from(buttons)) {
        expect(btn.getAttribute('type')).toBe('button');
      }
    });
  });

  // Physical-keyboard entry (useNotationKeyboardInput): typing drives the same
  // state machine as clicking. The window listener receives events bubbled from
  // wherever focus happens to be, so tests dispatch on `window` for plain
  // typing and on specific elements to exercise the target-based guards.
  describe('keyboard input', () => {
    /** Text currently shown in the SAN preview box. */
    function previewText(): string {
      const span = document.querySelector('.font-mono > span');
      if (!span) throw new Error('preview span not found');
      return span.textContent ?? '';
    }

    function typeKeys(...inits: (string | KeyboardEventInit)[]) {
      for (const init of inits) {
        fireEvent.keyDown(window, typeof init === 'string' ? { key: init } : init);
      }
    }

    it('builds a move in the preview from typed characters', () => {
      render(<ButtonInput fen={STARTING_FEN} onSubmit={() => {}} disabled={false} />);

      typeKeys({ key: 'N', shiftKey: true }, 'f', '3');

      expect(previewText()).toBe('Nf3');
    });

    it('ignores characters outside the notation set (e.g. z)', () => {
      render(<ButtonInput fen={STARTING_FEN} onSubmit={() => {}} disabled={false} />);

      typeKeys('z', 'i', '9', '0', '-');

      expect(previewText()).toBe('');
    });

    it('accepts Shift-modified symbols (+, #) via allowShift', () => {
      render(<ButtonInput fen={STARTING_FEN} onSubmit={() => {}} disabled={false} />);

      typeKeys('e', '4', { key: '+', shiftKey: true });

      expect(previewText()).toBe('e4+');
    });

    it('Backspace removes the last character', () => {
      render(<ButtonInput fen={STARTING_FEN} onSubmit={() => {}} disabled={false} />);

      typeKeys('e', '4', 'Backspace');

      expect(previewText()).toBe('e');
    });

    it('Enter (focus on body) submits a completed move', () => {
      const onSubmit = vi.fn();
      render(<ButtonInput fen={STARTING_FEN} onSubmit={onSubmit} disabled={false} />);

      typeKeys('e', '4');
      fireEvent.keyDown(document.body, { key: 'Enter' });

      expect(onSubmit).toHaveBeenCalledExactlyOnceWith('e4');
    });

    it('Enter does nothing while the input is empty (canSubmit=false)', () => {
      // `computeIsSubmittable` is simply input.length > 0 — SAN validity is
      // checked downstream on submit (mirroring the on-screen submit button,
      // which is likewise enabled for any non-empty input).
      const onSubmit = vi.fn();
      render(<ButtonInput fen={STARTING_FEN} onSubmit={onSubmit} disabled={false} />);

      fireEvent.keyDown(document.body, { key: 'Enter' });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('Enter submits when focus is on a button inside the keypad', () => {
      const onSubmit = vi.fn();
      render(<ButtonInput fen={STARTING_FEN} onSubmit={onSubmit} disabled={false} />);

      typeKeys('e', '4');
      fireEvent.keyDown(screen.getByRole('button', { name: 'e' }), { key: 'Enter' });

      expect(onSubmit).toHaveBeenCalledExactlyOnceWith('e4');
    });

    it('Enter is NOT stolen from a focused element outside the keypad', () => {
      // A window-level Enter handler must not swallow activation of other
      // tab-focusable controls on the page (resign button, nav links, …).
      const onSubmit = vi.fn();
      render(<ButtonInput fen={STARTING_FEN} onSubmit={onSubmit} disabled={false} />);
      const external = document.createElement('button');
      document.body.appendChild(external);

      typeKeys('e', '4');
      const swallowed = !fireEvent.keyDown(external, { key: 'Enter' });

      expect(onSubmit).not.toHaveBeenCalled();
      expect(swallowed).toBe(false); // preventDefault was not called
      external.remove();
    });

    it('ignores Ctrl/Meta-modified keys (browser shortcuts pass through)', () => {
      render(<ButtonInput fen={STARTING_FEN} onSubmit={() => {}} disabled={false} />);

      typeKeys({ key: 'e', ctrlKey: true }, { key: 'f', metaKey: true });

      expect(previewText()).toBe('');
    });

    it('ignores auto-repeat events from a held key', () => {
      render(<ButtonInput fen={STARTING_FEN} onSubmit={() => {}} disabled={false} />);

      typeKeys('e', { key: 'e', repeat: true });

      expect(previewText()).toBe('e');
    });

    it('ignores keys typed into an editable element', () => {
      render(<ButtonInput fen={STARTING_FEN} onSubmit={() => {}} disabled={false} />);
      const input = document.createElement('input');
      document.body.appendChild(input);

      fireEvent.keyDown(input, { key: 'e' });

      expect(previewText()).toBe('');
      input.remove();
    });

    it('does not react at all while disabled', () => {
      render(<ButtonInput fen={STARTING_FEN} onSubmit={() => {}} disabled={true} />);

      typeKeys('e', '4');

      expect(previewText()).toBe('');
    });
  });
});
