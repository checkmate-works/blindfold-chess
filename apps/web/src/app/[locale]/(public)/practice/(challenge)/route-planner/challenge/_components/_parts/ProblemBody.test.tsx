import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ProblemBody } from './ProblemBody';

vi.mock('@/i18n/use-safe-translations');

/** Dispatch on <body> as a real browser does with nothing focused. */
function press(...keys: string[]) {
  for (const key of keys) {
    act(() => {
      fireEvent.keyDown(document.body, { key });
    });
  }
}

function renderBody(onRecordResult = vi.fn()) {
  render(
    <ProblemBody
      currentProblem={{ piece: 'n', start: 'b1', end: 'e5' }}
      isDisabled={false}
      showFeedback={false}
      isPaused={false}
      countdown={null}
      onAnswer={vi.fn()}
      onRecordResult={onRecordResult}
    />
  );
  return onRecordResult;
}

describe('ProblemBody keyboard input', () => {
  it('backspaces through committed squares one character at a time', () => {
    renderBody();

    press('c', '3', 'd', '5');
    expect(screen.getByText('c3')).toBeDefined();
    expect(screen.getByText('d5')).toBeDefined();

    // d5 → d: the square leaves the path and its file stays staged.
    press('Backspace');
    expect(screen.queryByText('d5')).toBeNull();
    expect(screen.getByText('c3')).toBeDefined();

    // d → nothing; c3 is still committed.
    press('Backspace');
    expect(screen.getByText('c3')).toBeDefined();

    // Retyping a rank after the file was reopened completes a new square.
    press('Backspace', '4');
    expect(screen.queryByText('c3')).toBeNull();
    expect(screen.getByText('c4')).toBeDefined();
  });

  it('submits the typed path on Enter', () => {
    const onRecordResult = renderBody();

    press('Enter');
    expect(onRecordResult).not.toHaveBeenCalled();

    press('c', '3', 'Enter');
    expect(onRecordResult).toHaveBeenCalledTimes(1);
    expect(onRecordResult.mock.calls[0][0].userPath).toEqual(['c3', 'e5']);
  });
});
