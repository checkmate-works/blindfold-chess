import { describe, expect, it } from 'vitest';

import type { ChallengeResultRow } from '../_actions/get-challenge-sessions';
import { deriveOrientationFromSessions } from './derive-orientation-filter';

function run(
  leaderboardKey: string,
  daysAgo: number,
  menuType = 'coordinate_quiz'
): ChallengeResultRow {
  return {
    id: `${menuType}-${leaderboardKey}-${daysAgo}`,
    menuType,
    leaderboardKey,
    score: 10,
    incorrectAnswers: 0,
    timeTaken: 60,
    createdAt: new Date(Date.UTC(2026, 8, 10 - daysAgo)),
  };
}

describe('deriveOrientationFromSessions', () => {
  it('defaults to white with no sessions', () => {
    expect(deriveOrientationFromSessions([])).toBe('white');
  });

  it('follows the only orientation played', () => {
    expect(deriveOrientationFromSessions([run('black', 0), run('black', 2)])).toBe('black');
  });

  it('follows the most recent run when orientations are mixed, regardless of array order', () => {
    expect(
      deriveOrientationFromSessions([run('white', 3), run('random', 0), run('black', 1)])
    ).toBe('random');
    expect(deriveOrientationFromSessions([run('random', 0), run('white', 3)])).toBe('random');
  });

  it('ignores runs of other menus', () => {
    expect(deriveOrientationFromSessions([run('knight', 0, 'legal_moves'), run('black', 5)])).toBe(
      'black'
    );
  });

  it('falls back to white for an unknown key', () => {
    expect(deriveOrientationFromSessions([run('sideways', 0)])).toBe('white');
  });
});
