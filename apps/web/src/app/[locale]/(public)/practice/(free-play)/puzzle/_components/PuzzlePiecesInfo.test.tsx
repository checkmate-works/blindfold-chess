import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Server component: stub `next-intl/server`'s async `getTranslations` so the
// component renders synchronously after `await`-ing the imported helper.
// Returning the key verbatim lets assertions target deterministic strings.
vi.mock('next-intl/server', () => ({
  getTranslations: async () => (key: string) => key,
}));

const { PuzzlePiecesInfo } = await import('./PuzzlePiecesInfo');

afterEach(() => {
  cleanup();
});

async function renderInfo(fen: string, locale: 'en' | 'ja' | 'es' | 'pt-BR' = 'en') {
  const element = await PuzzlePiecesInfo({ fen, locale });
  return render(element);
}

// Find the <p> row whose label-span contains the given translation key. The
// component splits "{label}:" into two text nodes ({t('...')} + literal ":"),
// so `getByText` with a string matcher would fail; we use a function matcher
// that targets only the label span itself.
function findRowByLabel(labelKey: 'whitePiecesLabel' | 'blackPiecesLabel') {
  const labelSpans = screen
    .getAllByText((_, node) => {
      if (!node || node.tagName !== 'SPAN') return false;
      // The label span is `<span class="font-medium">{key}:</span>` —
      // first child is the translation key text node.
      return node.firstChild?.textContent === labelKey;
    })
    .map((el) => el.closest('p'));
  expect(labelSpans.length).toBeGreaterThan(0);
  return labelSpans[0]!;
}

describe('PuzzlePiecesInfo', () => {
  describe('side-to-move label', () => {
    it('renders the whiteToMove key for a white-to-move FEN', async () => {
      await renderInfo('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

      expect(screen.getByText('whiteToMove')).toBeInTheDocument();
      expect(screen.queryByText('blackToMove')).not.toBeInTheDocument();
    });

    it('renders the blackToMove key for a black-to-move FEN', async () => {
      await renderInfo('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1');

      expect(screen.getByText('blackToMove')).toBeInTheDocument();
      expect(screen.queryByText('whiteToMove')).not.toBeInTheDocument();
    });
  });

  describe('piece lists', () => {
    it('renders sorted white and black piece lists for a starting-position FEN', async () => {
      const { container } = await renderInfo(
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
      );

      const whiteRow = findRowByLabel('whitePiecesLabel');
      // King, Queen, Rooks, Bishops, Knights, then 8 pawns.
      expect(whiteRow.textContent).toContain('Ke1');
      expect(whiteRow.textContent).toContain('Qd1');
      expect(whiteRow.textContent).toContain('Ra1');
      expect(whiteRow.textContent).toContain('Rh1');
      expect(whiteRow.textContent).toContain('Bc1');
      expect(whiteRow.textContent).toContain('Bf1');
      expect(whiteRow.textContent).toContain('Nb1');
      expect(whiteRow.textContent).toContain('Ng1');
      expect(whiteRow.textContent).toContain('a2');
      expect(whiteRow.textContent).toContain('h2');

      const blackRow = findRowByLabel('blackPiecesLabel');
      expect(blackRow.textContent).toContain('Ke8');
      expect(blackRow.textContent).toContain('Qd8');
      expect(blackRow.textContent).toContain('Ra8');
      expect(blackRow.textContent).toContain('Rh8');
      expect(blackRow.textContent).toContain('a7');
      expect(blackRow.textContent).toContain('h7');

      // Smoke check: nothing crashed and the noPieces fallback isn't rendered.
      expect(container.textContent).not.toContain('noPieces');
    });

    it('renders the piece lists for a sparse endgame position', async () => {
      // Lone rook + king vs lone king. Same fixture used in
      // `fenToPieceList`'s own unit test, so the expected output is
      // deterministic and well-known: white = ["Kf5", "Rh8"],
      // black = ["Kf7", "f6"].
      await renderInfo('7R/5k2/5p2/5K2/8/8/8/8 w - - 0 1');

      const whiteRow = findRowByLabel('whitePiecesLabel');
      expect(whiteRow.textContent).toContain('Kf5');
      expect(whiteRow.textContent).toContain('Rh8');

      const blackRow = findRowByLabel('blackPiecesLabel');
      expect(blackRow.textContent).toContain('Kf7');
      expect(blackRow.textContent).toContain('f6');
    });
  });

  describe('noPieces fallback', () => {
    it('renders the noPieces key for both sides when the board is empty', async () => {
      // FEN is parsed without legality validation, so an all-empty
      // placement is accepted by `fenToPieceList`. Both sides have zero
      // pieces, so both rows fall back to the noPieces translation key.
      await renderInfo('8/8/8/8/8/8/8/8 w - - 0 1');

      const whiteRow = findRowByLabel('whitePiecesLabel');
      expect(whiteRow.textContent).toContain('noPieces');

      const blackRow = findRowByLabel('blackPiecesLabel');
      expect(blackRow.textContent).toContain('noPieces');
    });

    it('does not render the noPieces fallback when both sides have pieces', async () => {
      // White king on e1, black king + pawn — both sides have pieces, so
      // the fallback string should NOT appear in either row.
      await renderInfo('4k3/4p3/8/8/8/8/8/4K3 w - - 0 1');

      const whiteRow = findRowByLabel('whitePiecesLabel');
      expect(whiteRow.textContent).not.toContain('noPieces');
      expect(whiteRow.textContent).toContain('Ke1');

      const blackRow = findRowByLabel('blackPiecesLabel');
      expect(blackRow.textContent).not.toContain('noPieces');
      expect(blackRow.textContent).toContain('Ke8');
      expect(blackRow.textContent).toContain('e7');
    });
  });
});
