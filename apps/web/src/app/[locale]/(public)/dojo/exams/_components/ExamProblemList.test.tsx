import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ExamStatus } from '../_lib/types';
import { ExamProblemList } from './ExamProblemList';
import type { ExamProblemRow } from './ExamProblemList';

const mockGetExamStatus = vi.fn<(rank: string) => Promise<ExamStatus>>();

vi.mock('../_actions/getExamStatus', () => ({
  getExamStatus: (rank: string) => mockGetExamStatus(rank),
}));
vi.mock('@/i18n/routing', () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
// Echo the key with its interpolated values so a note's parameters are visible.
vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key} ${JSON.stringify(values)}` : key,
}));
vi.mock('@/lib/sentry/capture-error', () => ({ captureError: vi.fn() }));

const ROWS: ExamProblemRow[] = [
  {
    kind: 'position_memory',
    name: 'Position memory',
    rule: 'memory rule',
    href: '/dojo/exams/2kyu/position-memory',
  },
  { kind: 'puzzle', name: 'Puzzle', rule: 'puzzle rule', href: '/dojo/exams/2kyu/puzzle' },
];

function renderList() {
  return render(<ExamProblemList rank="2kyu" rows={ROWS} prevRankName="3kyu" />);
}

beforeEach(() => {
  mockGetExamStatus.mockReset();
});

describe('ExamProblemList', () => {
  it('links every problem to its own page', () => {
    mockGetExamStatus.mockReturnValue(new Promise(() => {}));
    renderList();

    const links = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(links).toEqual(['/dojo/exams/2kyu/position-memory', '/dojo/exams/2kyu/puzzle']);
  });

  it('marks the problems already passed on record as solved', async () => {
    mockGetExamStatus.mockResolvedValue({ signedIn: true, solved: ['puzzle'], eligible: true });
    renderList();

    expect(await screen.findByTestId('exam-problem-solved-puzzle')).toHaveTextContent('solved');
    expect(screen.queryByTestId('exam-problem-solved-position_memory')).not.toBeInTheDocument();
  });

  it('tells a signed-out viewer that signing in is what records a pass', async () => {
    mockGetExamStatus.mockResolvedValue({ signedIn: false });
    renderList();

    expect(await screen.findByTestId('exam-status-note')).toHaveTextContent('signInNote');
  });

  it('tells a player who would skip a rank that a pass is recorded only once the rank below is held', async () => {
    mockGetExamStatus.mockResolvedValue({ signedIn: true, solved: [], eligible: false });
    renderList();

    expect(await screen.findByTestId('exam-status-note')).toHaveTextContent(
      'lockedNote {"prevRankName":"3kyu"}'
    );
  });

  it('shows no note to a player on the rung right below the exam', async () => {
    mockGetExamStatus.mockResolvedValue({ signedIn: true, solved: [], eligible: true });
    renderList();

    await waitFor(() => expect(mockGetExamStatus).toHaveBeenCalledWith('2kyu'));
    await Promise.resolve();
    expect(screen.queryByTestId('exam-status-note')).not.toBeInTheDocument();
  });
});
