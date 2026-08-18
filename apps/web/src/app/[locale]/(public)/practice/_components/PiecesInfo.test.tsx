import type { ReactNode } from 'react';

import { NextIntlClientProvider } from 'next-intl';

import { IntlAvailableContext } from '@/i18n/IntlAvailableContext';
import enMessages from '@/messages/en.json';
import * as matchers from '@testing-library/jest-dom/matchers';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PiecesInfo } from './PiecesInfo';

expect.extend(matchers);

function renderInfo(fen: string, showSideToMove?: boolean) {
  const ui: ReactNode = <PiecesInfo fen={fen} showSideToMove={showSideToMove} />;
  return render(
    <NextIntlClientProvider
      locale="en"
      messages={enMessages as unknown as Record<string, unknown>}
      timeZone="UTC"
    >
      <IntlAvailableContext.Provider value={true}>{ui}</IntlAvailableContext.Provider>
    </NextIntlClientProvider>
  );
}

function findRowByLabel(label: 'White Pieces' | 'Black Pieces') {
  const labelSpans = screen
    .getAllByText((_, node) => {
      if (!node || node.tagName !== 'SPAN') return false;
      return node.firstChild?.textContent === label;
    })
    .map((el) => el.closest('p'));
  expect(labelSpans.length).toBeGreaterThan(0);
  return labelSpans[0]!;
}

describe('PiecesInfo', () => {
  describe('side-to-move label', () => {
    it('renders "White to move" for a white-to-move FEN', () => {
      renderInfo('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

      expect(screen.getByText('White to move')).toBeInTheDocument();
      expect(screen.queryByText('Black to move')).not.toBeInTheDocument();
    });

    it('renders "Black to move" for a black-to-move FEN', () => {
      renderInfo('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1');

      expect(screen.getByText('Black to move')).toBeInTheDocument();
      expect(screen.queryByText('White to move')).not.toBeInTheDocument();
    });

    it('omits the side-to-move line when showSideToMove is false', () => {
      renderInfo('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', false);

      expect(screen.queryByText('White to move')).not.toBeInTheDocument();
      expect(screen.queryByText('Black to move')).not.toBeInTheDocument();
      // The piece lists still render.
      expect(findRowByLabel('White Pieces').textContent).toContain('Ke1');
    });
  });

  describe('piece lists', () => {
    it('renders sorted white and black piece lists for a starting-position FEN', () => {
      const { container } = renderInfo('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

      const whiteRow = findRowByLabel('White Pieces');
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

      const blackRow = findRowByLabel('Black Pieces');
      expect(blackRow.textContent).toContain('Ke8');
      expect(blackRow.textContent).toContain('Qd8');
      expect(blackRow.textContent).toContain('Ra8');
      expect(blackRow.textContent).toContain('Rh8');
      expect(blackRow.textContent).toContain('a7');
      expect(blackRow.textContent).toContain('h7');

      expect(container.textContent).not.toContain('None');
    });

    it('renders the piece lists for a sparse endgame position', () => {
      renderInfo('7R/5k2/5p2/5K2/8/8/8/8 w - - 0 1');

      const whiteRow = findRowByLabel('White Pieces');
      expect(whiteRow.textContent).toContain('Kf5');
      expect(whiteRow.textContent).toContain('Rh8');

      const blackRow = findRowByLabel('Black Pieces');
      expect(blackRow.textContent).toContain('Kf7');
      expect(blackRow.textContent).toContain('f6');
    });
  });

  describe('noPieces fallback', () => {
    it('renders the "None" fallback for both sides when the board is empty', () => {
      renderInfo('8/8/8/8/8/8/8/8 w - - 0 1');

      const whiteRow = findRowByLabel('White Pieces');
      expect(whiteRow.textContent).toContain('None');

      const blackRow = findRowByLabel('Black Pieces');
      expect(blackRow.textContent).toContain('None');
    });

    it('does not render the "None" fallback when both sides have pieces', () => {
      renderInfo('4k3/4p3/8/8/8/8/8/4K3 w - - 0 1');

      const whiteRow = findRowByLabel('White Pieces');
      expect(whiteRow.textContent).not.toContain('None');
      expect(whiteRow.textContent).toContain('Ke1');

      const blackRow = findRowByLabel('Black Pieces');
      expect(blackRow.textContent).not.toContain('None');
      expect(blackRow.textContent).toContain('Ke8');
      expect(blackRow.textContent).toContain('e7');
    });
  });
});
