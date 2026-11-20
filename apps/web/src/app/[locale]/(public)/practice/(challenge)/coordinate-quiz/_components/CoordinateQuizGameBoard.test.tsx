// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CoordinateQuizGameBoard } from './CoordinateQuizGameBoard';

vi.mock('@/i18n/use-safe-translations');

vi.mock('./CoordinateQuizBoard', () => ({
  CoordinateQuizBoard: () => null,
}));

const QUESTION = { targetSquare: 'e4', orientation: 'white' } as const;

function renderBoard(overrides: Partial<Parameters<typeof CoordinateQuizGameBoard>[0]>) {
  return render(
    <CoordinateQuizGameBoard
      currentQuestion={QUESTION}
      onSquareClick={() => {}}
      lastClickedSquare={null}
      showFeedback={false}
      isCorrect={false}
      countdown={null}
      {...overrides}
    />
  );
}

describe('CoordinateQuizGameBoard target coordinate', () => {
  it('shows the target while the question awaits an answer', () => {
    renderBoard({});

    expect(screen.queryByText('e4')).not.toBeNull();
  });

  // Between the feedback flash and the server's next question the question
  // held is the one just answered; its coordinate must not come back as if it
  // were a new prompt.
  it('keeps the answered target off the board while hideTarget is set', () => {
    renderBoard({ hideTarget: true, isObscured: true });

    expect(screen.queryByText('e4')).toBeNull();
  });
});
