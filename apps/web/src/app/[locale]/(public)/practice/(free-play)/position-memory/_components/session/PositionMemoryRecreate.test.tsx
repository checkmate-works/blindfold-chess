import { fireEvent, render, screen } from '@testing-library/react';
import { STARTING_FEN } from '@blindfold-chess/features/chess-core/fen';
import { describe, expect, it, vi } from 'vitest';

import { PositionMemoryRecreate } from './PositionMemoryRecreate';

vi.mock('@/i18n/use-safe-translations');
vi.mock('@/app/[locale]/_components/ConfirmationModal');
vi.mock('@/app/[locale]/(public)/practice/(free-play)/_components/EditableChessBoard');

const ORIGINAL_FEN = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
const EMPTY_FEN = '8/8/8/8/8/8/8/8 w - - 0 1';
const PARTIAL_FEN = '8/8/8/8/4P3/8/8/8 w - - 0 1';

function renderRecreate(props: { recreatedPosition: string; startFen?: string }) {
  const onPositionChange = vi.fn();
  render(
    <PositionMemoryRecreate
      originalPosition={{ fen: ORIGINAL_FEN, isBlackToMove: true }}
      currentProblemIndex={0}
      problemCount={1}
      onSubmit={vi.fn()}
      onViewAgain={vi.fn()}
      onSkip={vi.fn()}
      onQuit={vi.fn()}
      onPositionChange={onPositionChange}
      {...props}
    />
  );
  return { onPositionChange };
}

const startButton = () => screen.getByRole('button', { name: /loadStartPosition/ });
const clearButton = () => screen.getByRole('button', { name: 'clearBoard' });

describe('PositionMemoryRecreate board tools', () => {
  it('offers no starting-position button without a startFen', () => {
    renderRecreate({ recreatedPosition: EMPTY_FEN });
    expect(screen.queryByRole('button', { name: /loadStartPosition/ })).toBeNull();
  });

  it('loads the starting placement onto an empty board, keeping the original turn info', () => {
    const { onPositionChange } = renderRecreate({
      recreatedPosition: EMPTY_FEN,
      startFen: STARTING_FEN,
    });

    fireEvent.click(startButton());

    expect(onPositionChange).toHaveBeenCalledWith(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1'
    );
  });

  it('disables the starting-position button once any piece is on the board', () => {
    renderRecreate({ recreatedPosition: PARTIAL_FEN, startFen: STARTING_FEN });
    expect(startButton()).toBeDisabled();
  });

  it('disables clear on an empty board', () => {
    renderRecreate({ recreatedPosition: EMPTY_FEN });
    expect(clearButton()).toBeDisabled();
  });

  it('clears the board only after confirmation', () => {
    const { onPositionChange } = renderRecreate({ recreatedPosition: PARTIAL_FEN });

    fireEvent.click(clearButton());
    expect(onPositionChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'clearBoardConfirmYes' }));
    expect(onPositionChange).toHaveBeenCalledWith('8/8/8/8/8/8/8/8 b KQkq - 0 1');
  });

  it('leaves the board alone when the confirmation is cancelled', () => {
    const { onPositionChange } = renderRecreate({ recreatedPosition: PARTIAL_FEN });

    fireEvent.click(clearButton());
    fireEvent.click(screen.getByRole('button', { name: 'clearBoardConfirmNo' }));

    expect(onPositionChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
