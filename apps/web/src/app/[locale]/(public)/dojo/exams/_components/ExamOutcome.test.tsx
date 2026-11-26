import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ExamVerdict } from '../_hooks/use-exam-submission';
import { ExamOutcome } from './ExamOutcome';

vi.mock('@/i18n/routing', () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key} ${JSON.stringify(values)}` : key,
}));

function renderOutcome(verdict: Exclude<ExamVerdict, { kind: 'idle' }>, onRetry = vi.fn()) {
  render(<ExamOutcome rank="2kyu" verdict={verdict} prevRankName="3kyu" onRetry={onRetry} />);
  return onRetry;
}

const message = () => screen.getByTestId('exam-outcome-message').textContent;
const note = () => screen.queryByTestId('exam-outcome-note')?.textContent ?? null;

describe('ExamOutcome', () => {
  it('shows a recorded pass with no note', () => {
    renderOutcome({ kind: 'graded', passed: true, accuracy: null, unrecorded: null });

    expect(message()).toBe('passed');
    expect(note()).toBeNull();
  });

  it('shows a signed-out pass as unrecorded, with the sign-in note', () => {
    renderOutcome({ kind: 'graded', passed: true, accuracy: null, unrecorded: 'signIn' });

    expect(message()).toBe('passedUnrecorded');
    expect(note()).toBe('signInNote');
  });

  it('shows a pass by a player without the rank below as unrecorded, naming that rank', () => {
    renderOutcome({ kind: 'graded', passed: true, accuracy: null, unrecorded: 'locked' });

    expect(message()).toBe('passedUnrecorded');
    expect(note()).toBe('lockedNote {"prevRankName":"3kyu"}');
  });

  it('shows a signed-out fail with the sign-in note', () => {
    renderOutcome({ kind: 'graded', passed: false, accuracy: 40, unrecorded: 'signIn' });

    expect(message()).toBe('failed');
    expect(note()).toBe('signInNote');
  });

  it('rounds the accuracy of a memory attempt for display', () => {
    renderOutcome({ kind: 'graded', passed: false, accuracy: 71.875, unrecorded: null });

    expect(screen.getByText('accuracy: 72%')).toBeInTheDocument();
  });

  it('offers a retry and the way back once the attempt is settled', () => {
    const onRetry = renderOutcome({ kind: 'error' });

    expect(message()).toBe('recordFailed');
    fireEvent.click(screen.getByRole('button', { name: 'retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/dojo/exams/2kyu');
  });

  it('offers no retry while the answer is being sent or the promotion is under way', () => {
    renderOutcome({ kind: 'submitting' });
    expect(screen.queryByRole('button', { name: 'retry' })).not.toBeInTheDocument();
  });
});
