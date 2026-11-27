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

function renderPage() {
  render(
    <ExamPuzzleSession
      rank="2kyu"
      problem={PROBLEM}
      title="Puzzle"
      piecesInfo={null}
      breadcrumb={null}
      breadcrumbItems={[]}
      locale="en"
      prevRankName="3kyu"
      intro={<p data-testid="intro" />}
    />
  );
}

/** Renders the page and starts the attempt, as the player does. */
function renderSession() {
  renderPage();
  fireEvent.click(screen.getByRole('button', { name: 'start' }));
}

beforeEach(() => {
  mockSubmitExamAnswer.mockReset();
  sessionProps.mockReset();
});

describe('ExamPuzzleSession', () => {
  it('opens on the intro and mounts the session only once the attempt starts', () => {
    renderPage();

    expect(screen.getByTestId('intro')).toBeInTheDocument();
    expect(sessionProps).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'start' }));

    expect(screen.queryByTestId('intro')).not.toBeInTheDocument();
    expect(screen.getByTestId('stub-solve')).toBeInTheDocument();
  });

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
