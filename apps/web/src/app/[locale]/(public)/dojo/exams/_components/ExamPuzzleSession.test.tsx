import { DOJO_EXAMS } from '@blindfold-chess/features/dojo-journey';
import type { PuzzleExamProblem } from '@blindfold-chess/features/dojo-journey';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ExamPuzzleSession } from './ExamPuzzleSession';

const mockSubmitExamAnswer = vi.fn();
const sessionProps = vi.fn();

vi.mock('../_actions/submitExamAnswer', () => ({
  submitExamAnswer: (...args: unknown[]) => mockSubmitExamAnswer(...args),
}));
vi.mock('@/i18n/routing', () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('@/i18n/use-safe-translations');
vi.mock('@/lib/sentry/capture-error', () => ({ captureError: vi.fn() }));
// The session itself is covered by its own tests; here it is a stand-in that
// solves with the exam's moves through the `onSolve` it was given.
vi.mock(
  '@/app/[locale]/(public)/practice/(free-play)/puzzle/_components/session/PuzzleSessionClient',
  () => ({
    PuzzleSessionClient: (props: {
      onSolve?: (solve: unknown, moves: string[]) => void;
      hideShowAnswer?: boolean;
    }) => {
      sessionProps(props);
      return (
        <button
          type="button"
          data-testid="stub-solve"
          onClick={() => props.onSolve?.({}, ['Qg8', 'Nf7#'])}
        />
      );
    },
  })
);

const PROBLEM = DOJO_EXAMS['2kyu']!.puzzle as PuzzleExamProblem;

function renderSession() {
  render(
    <ExamPuzzleSession
      rank="2kyu"
      problem={PROBLEM}
      title="Puzzle"
      piecesInfo={null}
      breadcrumb={null}
      prevRankName="3kyu"
    />
  );
}

beforeEach(() => {
  mockSubmitExamAnswer.mockReset();
  sessionProps.mockReset();
});

describe('ExamPuzzleSession', () => {
  it('runs the session without the "show answer" link', () => {
    renderSession();

    expect(sessionProps).toHaveBeenLastCalledWith(
      expect.objectContaining({ hideShowAnswer: true })
    );
  });

  it('sends the moves the player entered and replaces the session with the verdict', async () => {
    mockSubmitExamAnswer.mockResolvedValue({
      success: true,
      passed: true,
      accuracy: null,
      recorded: true,
      grantedRanks: [],
    });
    renderSession();

    await act(async () => {
      fireEvent.click(screen.getByTestId('stub-solve'));
    });

    expect(mockSubmitExamAnswer).toHaveBeenCalledWith('2kyu', 'puzzle', { moves: ['Qg8', 'Nf7#'] });
    await waitFor(() =>
      expect(screen.getByTestId('exam-outcome-message')).toHaveTextContent('passed')
    );
    expect(screen.queryByTestId('stub-solve')).not.toBeInTheDocument();
  });

  it('mounts a fresh session on retry', async () => {
    mockSubmitExamAnswer.mockResolvedValue({ error: 'rateLimited' });
    renderSession();

    await act(async () => {
      fireEvent.click(screen.getByTestId('stub-solve'));
    });
    fireEvent.click(await screen.findByRole('button', { name: 'retry' }));

    expect(screen.getByTestId('stub-solve')).toBeInTheDocument();
  });
});
