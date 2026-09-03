/**
 * `RecordSection` is the signed-in counterpart of the sign-up banner on the
 * practice result page. Its `loading.tsx` placeholder reserves a fixed shape,
 * so beyond the copy these tests pin the structural invariant: every state
 * renders the same header row, three rows (this run, last run, previous
 * best) and one link row.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ScoreComparison } from '@/lib/db/score-comparison';

vi.mock('next-intl/server', () => ({
  getTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${JSON.stringify(values)}` : key,
}));

vi.mock('@/i18n/routing');

const { RecordSection } = await import('./RecordSection');

const run = (score: number, incorrectAnswers = 0, timeTaken = 60) => ({
  score,
  incorrectAnswers,
  timeTaken,
});

async function renderSection(comparison: ScoreComparison) {
  const element = await RecordSection({
    locale: 'en',
    menuType: 'coordinate_quiz',
    comparison,
  });
  return render(element);
}

function expectFixedShape() {
  const card = screen.getByTestId('record-section');
  expect([...card.querySelectorAll('dt')].map((dt) => dt.textContent)).toEqual([
    'thisTime',
    'previousLast',
    'previousBest',
  ]);
  expect(card.querySelectorAll('dd')).toHaveLength(3);
  expect(screen.getByText('viewMyRecords', { exact: false }).closest('a')).toHaveAttribute(
    'href',
    '/mypage/challenges?menu=coordinate_quiz'
  );
}

/** The `<dd>` paired with the given row label. */
function rowValue(label: string) {
  return screen.getByText(label).nextElementSibling as HTMLElement;
}

describe('RecordSection', () => {
  it('renders all three rows, with the diff on the "this time" row, and no badge for an ordinary run', async () => {
    await renderSection({ current: run(8), previousBest: run(12), previousLast: run(9) });

    expectFixedShape();
    expect(rowValue('thisTime')).toHaveTextContent('scoreValue:{"score":8}');
    expect(rowValue('thisTime')).toHaveTextContent('▼1');
    expect(rowValue('previousLast')).toHaveTextContent('scoreValue:{"score":9}');
    expect(rowValue('previousLast')).not.toHaveTextContent('▼');
    expect(rowValue('previousBest')).toHaveTextContent('scoreValue:{"score":12}');
    expect(screen.queryByText('newBest')).not.toBeInTheDocument();
    expect(screen.queryByText('firstRecord')).not.toBeInTheDocument();
  });

  it('shows the new-best badge and a positive diff when the run beats the previous best', async () => {
    await renderSection({ current: run(14), previousBest: run(12), previousLast: run(9) });

    expectFixedShape();
    expect(screen.getByText('newBest')).toBeInTheDocument();
    expect(screen.getByText('▲5')).toBeInTheDocument();
  });

  it('shows the first-record badge and dashes on a first-ever run', async () => {
    await renderSection({ current: run(5), previousBest: undefined, previousLast: undefined });

    expectFixedShape();
    expect(screen.getByText('firstRecord')).toBeInTheDocument();
    expect(rowValue('thisTime')).toHaveTextContent('scoreValue:{"score":5}');
    expect(screen.getAllByText('—')).toHaveLength(2);
  });

  it('shows history with a dash for "this time" and no badge or diff when no current run resolves', async () => {
    await renderSection({ current: undefined, previousBest: run(12), previousLast: run(12) });

    expectFixedShape();
    expect(rowValue('thisTime')).toHaveTextContent('—');
    expect(screen.queryByText('newBest')).not.toBeInTheDocument();
    expect(screen.queryByText('firstRecord')).not.toBeInTheDocument();
    expect(screen.queryByText(/[▲▼±]/)).not.toBeInTheDocument();
  });

  it('renders ±0 when the run ties the last one', async () => {
    await renderSection({ current: run(9), previousBest: run(12), previousLast: run(9) });

    expect(screen.getByText('±0')).toBeInTheDocument();
  });
});
