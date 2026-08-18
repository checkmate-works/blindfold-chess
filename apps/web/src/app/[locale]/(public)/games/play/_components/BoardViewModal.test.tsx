/**
 * Tests for BoardViewModal's optional footer slot — the shared replay uses it
 * for an "open this position" CTA out of the quick-peek modal, while the result
 * page omits it. The footer must render when provided and must not let a tap
 * fall through to the backdrop's close handler.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { BoardViewModal } from './BoardViewModal';

vi.mock('@/i18n/use-safe-translations');

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const PREFS: GamePreferences = {
  showCoordinates: true,
  highlightLastMove: true,
  showPieceDestinations: true,
  boardTheme: 'monotone',
  showOwnPieces: true,
  showOpponentPieces: true,
  pieceShapeMode: 'normal',
  pieceColors: 'normal',
  pawnHideMode: 'none',
  moveInputMode: 'text',
  enabledMoveInputModes: ['text'],
  buttonInputPieceLabel: 'icon',
  enableAutoComplete: true,
  boardVisibility: 'always',
  aiReplyDuration: 5000,
};

function renderModal(props: Partial<React.ComponentProps<typeof BoardViewModal>> = {}) {
  const onClose = vi.fn();
  const result = render(
    <BoardViewModal
      isOpen
      onClose={onClose}
      fen={STARTING_FEN}
      playerSide="white"
      lastMove={null}
      preferences={PREFS}
      movesLength={0}
      currentPosition={-1}
      formattedPgn={[]}
      {...props}
    />
  );
  return { onClose, ...result };
}

describe('BoardViewModal footer', () => {
  it('renders the footer when provided', () => {
    renderModal({ footer: <button type="button">GO_TO_POSITION</button> });
    expect(screen.getByText('GO_TO_POSITION')).toBeInTheDocument();
  });

  it('omits the footer when not provided', () => {
    renderModal();
    expect(screen.queryByText('GO_TO_POSITION')).not.toBeInTheDocument();
  });

  it('does not close the modal when the footer is tapped (stops propagation)', () => {
    const { onClose } = renderModal({
      footer: <button type="button">GO_TO_POSITION</button>,
    });
    fireEvent.click(screen.getByText('GO_TO_POSITION'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
