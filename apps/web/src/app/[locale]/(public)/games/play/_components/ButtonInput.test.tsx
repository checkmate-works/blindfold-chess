import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

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

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// aria-label values that identify each interactive button exactly, matching
// the translation keys used inside `ButtonInput` (next-intl mock returns keys
// verbatim).
const PIECE_LABELS = ['piece.king', 'piece.queen', 'piece.rook', 'piece.bishop', 'piece.knight'];
const CAPTURE_LABEL = 'symbol.capture';
const ANNOTATION_LABELS = ['symbol.check', 'symbol.promotion', 'symbol.checkmate'];
const CASTLING_LABELS = ['castling.kingside', 'castling.queenside'];
const UTILITY_LABELS = ['action.backspace', 'action.clear'];
const SUBMIT_LABEL = 'action.submit';

afterEach(() => {
  cleanup();
});

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
});
