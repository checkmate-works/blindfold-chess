import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  AttemptHistoryPanel,
  AttemptStatusBadge,
  buildCells,
  buildRows,
  computeAttemptStatus,
  groupAttemptsByPlayerStep,
} from './AttemptHistoryPanel';

// Return translation keys verbatim (with arguments interpolated as JSON) so
// assertions can match deterministic strings without depending on locale
// bundles. The badge uses `t('statusPartial', {correct, total})`, so we
// surface those values for the assertion to inspect.
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, args?: Record<string, unknown>) =>
    args ? `${key}:${JSON.stringify(args)}` : key,
}));

afterEach(() => {
  cleanup();
});

describe('groupAttemptsByPlayerStep', () => {
  it('opens a fresh group after each correct attempt', () => {
    const groups = groupAttemptsByPlayerStep([
      { move: 'Qg7+', isCorrect: false },
      { move: 'Qh6+', isCorrect: false },
      { move: 'Qxh7+', isCorrect: true },
      { move: 'Bxh7', isCorrect: false },
      { move: 'Bf5#', isCorrect: true },
    ]);
    expect(groups).toEqual([
      { wrongMoves: ['Qg7+', 'Qh6+'], correctMove: 'Qxh7+' },
      { wrongMoves: ['Bxh7'], correctMove: 'Bf5#' },
    ]);
  });

  it('keeps a trailing wrong-only group when the puzzle was abandoned', () => {
    const groups = groupAttemptsByPlayerStep([
      { move: 'e4', isCorrect: true },
      { move: 'Bb5', isCorrect: false },
    ]);
    expect(groups).toEqual([
      { wrongMoves: [], correctMove: 'e4' },
      { wrongMoves: ['Bb5'], correctMove: null },
    ]);
  });

  it('returns an empty array for no attempts', () => {
    expect(groupAttemptsByPlayerStep([])).toEqual([]);
  });
});

describe('buildCells', () => {
  it('alternates solved player cells and opponent cells starting with the player', () => {
    const groups = groupAttemptsByPlayerStep([
      { move: 'Qxh7+', isCorrect: true },
      { move: 'Bf5#', isCorrect: true },
    ]);
    const cells = buildCells(['Qxh7+', 'Kxh7', 'Bf5#'], groups);
    expect(cells).toEqual([
      { kind: 'solved', wrongMoves: [], correctMove: 'Qxh7+' },
      { kind: 'opponent', san: 'Kxh7' },
      { kind: 'solved', wrongMoves: [], correctMove: 'Bf5#' },
    ]);
  });

  it('marks an attempted-but-abandoned step as `revealed`, surfacing the canonical SAN', () => {
    const groups = groupAttemptsByPlayerStep([{ move: 'Bb5', isCorrect: false }]);
    const cells = buildCells(['e4'], groups);
    expect(cells[0]).toEqual({
      kind: 'revealed',
      wrongMoves: ['Bb5'],
      expectedMove: 'e4',
    });
  });

  it('marks unreached player slots as `skipped`', () => {
    // Two-step puzzle, but the user solved nothing and clicked View Result.
    // No attempt groups at all → both player cells are `skipped`.
    const cells = buildCells(['Qxh7+', 'Kxh7', 'Bf5#'], []);
    expect(cells[0]).toEqual({ kind: 'skipped', expectedMove: 'Qxh7+' });
    expect(cells[2]).toEqual({ kind: 'skipped', expectedMove: 'Bf5#' });
  });
});

describe('buildRows', () => {
  it('pairs cells into white/black rows with fullmove numbering for white-to-move', () => {
    const cells = buildCells(
      ['Qxh7+', 'Kxh7', 'Bf5#'],
      groupAttemptsByPlayerStep([
        { move: 'Qxh7+', isCorrect: true },
        { move: 'Bf5#', isCorrect: true },
      ])
    );
    const rows = buildRows(cells, 'w', 15);
    expect(rows).toHaveLength(2);
    expect(rows[0]!.moveNumber).toBe(15);
    expect(rows[0]!.white.kind).toBe('solved');
    expect(rows[0]!.black.kind).toBe('opponent');
    expect(rows[1]!.moveNumber).toBe(16);
    expect(rows[1]!.white.kind).toBe('solved');
    expect(rows[1]!.black.kind).toBe('empty');
  });

  it('opens with an empty white cell when the puzzle starts with black to move', () => {
    const cells = buildCells(
      ['Rxa1', 'Kxa1'],
      groupAttemptsByPlayerStep([{ move: 'Rxa1', isCorrect: true }])
    );
    const rows = buildRows(cells, 'b', 30);
    expect(rows[0]!.moveNumber).toBe(30);
    expect(rows[0]!.white.kind).toBe('empty');
    expect(rows[0]!.black.kind).toBe('solved');
    expect(rows[1]!.moveNumber).toBe(31);
    expect(rows[1]!.white.kind).toBe('opponent');
    expect(rows[1]!.black.kind).toBe('empty');
  });
});

describe('computeAttemptStatus', () => {
  it('reports `solved` when every player slot was answered correctly', () => {
    const status = computeAttemptStatus(
      [
        { move: 'Qxh7+', isCorrect: true },
        { move: 'Bf5#', isCorrect: true },
      ],
      ['Qxh7+', 'Kxh7', 'Bf5#']
    );
    expect(status).toEqual({ state: 'solved', correctCount: 2, totalPlayerSteps: 2 });
  });

  it('reports `partial` when the user solved some but not all player slots', () => {
    const status = computeAttemptStatus(
      [
        { move: 'Qxh7+', isCorrect: true },
        { move: 'Bxh7', isCorrect: false },
      ],
      ['Qxh7+', 'Kxh7', 'Bf5#']
    );
    expect(status).toEqual({ state: 'partial', correctCount: 1, totalPlayerSteps: 2 });
  });

  it('reports `revealed` when the user gave up before solving any player slot', () => {
    const status = computeAttemptStatus(
      [{ move: 'Qg7+', isCorrect: false }],
      ['Qxh7+', 'Kxh7', 'Bf5#']
    );
    expect(status).toEqual({ state: 'revealed', correctCount: 0, totalPlayerSteps: 2 });
  });
});

describe('AttemptStatusBadge', () => {
  it('renders the localized solved label for a fully-solved status', () => {
    render(
      <AttemptStatusBadge status={{ state: 'solved', correctCount: 2, totalPlayerSteps: 2 }} />
    );
    expect(screen.getByText('statusSolved')).toBeTruthy();
  });

  it('renders the partial-solved label with the correct/total interpolation', () => {
    render(
      <AttemptStatusBadge status={{ state: 'partial', correctCount: 1, totalPlayerSteps: 3 }} />
    );
    expect(screen.getByText('statusPartial:{"correct":1,"total":3}')).toBeTruthy();
  });

  it('renders the revealed label when the user solved nothing', () => {
    render(
      <AttemptStatusBadge status={{ state: 'revealed', correctCount: 0, totalPlayerSteps: 2 }} />
    );
    expect(screen.getByText('statusRevealed')).toBeTruthy();
  });
});

describe('AttemptHistoryPanel rendering', () => {
  it('renders wrong attempts and correct moves with PGN-style numbering', () => {
    render(
      <AttemptHistoryPanel
        fen="r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 15"
        solutionSans={['Qxh7+', 'Kxh7', 'Bf5#']}
        attempts={[
          { move: 'Qg7+', isCorrect: false },
          { move: 'Qxh7+', isCorrect: true },
          { move: 'Bxh7', isCorrect: false },
          { move: 'Bf5#', isCorrect: true },
        ]}
      />
    );
    expect(screen.getByText('15.')).toBeTruthy();
    expect(screen.getByText('16.')).toBeTruthy();
    expect(screen.getByText('Qg7+')).toBeTruthy();
    expect(screen.getByText('Qxh7+')).toBeTruthy();
    expect(screen.getByText('Kxh7')).toBeTruthy();
    expect(screen.getByText('Bxh7')).toBeTruthy();
    expect(screen.getByText('Bf5#')).toBeTruthy();
  });

  it("renders unreached player slots as the canonical SAN (the user's give-up reveals the answer)", () => {
    // Two-step puzzle, user solved step 1 then clicked View Result without
    // attempting step 2. Step 1 still shows the user's correct chip; step 2
    // shows only the canonical SAN as a revealed answer.
    render(
      <AttemptHistoryPanel
        fen="r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 15"
        solutionSans={['Qxh7+', 'Kxh7', 'Bf5#']}
        attempts={[{ move: 'Qxh7+', isCorrect: true }]}
      />
    );
    expect(screen.getByText('Qxh7+')).toBeTruthy();
    expect(screen.getByText('Kxh7')).toBeTruthy();
    // `Bf5#` is the canonical SAN the user never typed — still rendered.
    expect(screen.getByText('Bf5#')).toBeTruthy();
  });

  it('renders nothing when there are no attempts and no solution moves', () => {
    const { container } = render(
      <AttemptHistoryPanel fen="8/8/8/8/8/8/8/8 w - - 0 1" solutionSans={[]} attempts={[]} />
    );
    expect(container.firstChild).toBeNull();
  });
});
