import { describe, expect, it } from 'vitest';

import { parseRequirements, ranksSeedData } from '@/lib/db/data/ranks';
import type { ChallengeScoreRequirement } from '@/lib/db/data/ranks';

import {
  buildChallengeNameKey,
  buildPositionSubmissionLabels,
  buildRequirementItems,
  buildRequirementLabels,
  getRankCardState,
  isRankEarnedByPlaying,
} from './requirement-items';

// ---------------------------------------------------------------------------
// buildChallengeNameKey
// ---------------------------------------------------------------------------

describe('buildChallengeNameKey', () => {
  it('should return menuType alone when leaderboardKey is "default"', () => {
    const req: ChallengeScoreRequirement = {
      type: 'challenge_score',
      menuType: 'square_colors',
      leaderboardKey: 'default',
      minScore: 15,
    };
    expect(buildChallengeNameKey(req)).toBe('square_colors');
  });

  it('should return menuType_leaderboardKey when leaderboardKey is not "default"', () => {
    const req: ChallengeScoreRequirement = {
      type: 'challenge_score',
      menuType: 'coordinate_quiz',
      leaderboardKey: 'white',
      minScore: 20,
    };
    expect(buildChallengeNameKey(req)).toBe('coordinate_quiz_white');
  });

  it('should handle an empty string leaderboardKey (not "default")', () => {
    const req: ChallengeScoreRequirement = {
      type: 'challenge_score',
      menuType: 'coordinate_quiz',
      leaderboardKey: '',
      minScore: 10,
    };
    expect(buildChallengeNameKey(req)).toBe('coordinate_quiz_');
  });

  it('should return "legal_moves_bishop" for the 4kyu bishop requirement', () => {
    const req: ChallengeScoreRequirement = {
      type: 'challenge_score',
      menuType: 'legal_moves',
      leaderboardKey: 'bishop',
      minScore: 10,
    };
    expect(buildChallengeNameKey(req)).toBe('legal_moves_bishop');
  });

  it('should return "legal_moves_knight" for the 4kyu knight requirement', () => {
    const req: ChallengeScoreRequirement = {
      type: 'challenge_score',
      menuType: 'legal_moves',
      leaderboardKey: 'knight',
      minScore: 20,
    };
    expect(buildChallengeNameKey(req)).toBe('legal_moves_knight');
  });

  it('should return "legal_moves_king" for legal_moves with king leaderboardKey', () => {
    const req: ChallengeScoreRequirement = {
      type: 'challenge_score',
      menuType: 'legal_moves',
      leaderboardKey: 'king',
      minScore: 20,
    };
    expect(buildChallengeNameKey(req)).toBe('legal_moves_king');
  });
});

// ---------------------------------------------------------------------------
// buildRequirementItems
// ---------------------------------------------------------------------------

describe('buildRequirementItems', () => {
  const mockT = (key: string, values?: Record<string, string | number | Date>) => {
    if (key === 'challengeScore') return `Score ${values?.minScore}+ in ${values?.challengeName}`;
    if (key.startsWith('challengeNames.')) return key.replace('challengeNames.', '');
    if (key === 'submissionCount') return `Submit ${values?.minCount} ${values?.itemName}`;
    if (key.startsWith('submissionItemNames.')) return key.replace('submissionItemNames.', '');
    if (key === 'orDivider') return 'or';
    if (key === 'gamePublishWin') return `Beat the engine ${values?.minCount}+ times`;
    if (key === 'gamePublishWinHiddenBoard') return `Keep the board hidden and win`;
    if (key === 'gamePublishWinHiddenBoardNote') return `Peeking allowed up to ${values?.maxPeeks}`;
    return key;
  };

  it('should generate challenge URL with piece parameter for legal_moves', () => {
    const items = buildRequirementItems(
      [{ type: 'challenge_score', menuType: 'legal_moves', leaderboardKey: 'king', minScore: 20 }],
      'en',
      mockT
    );
    expect(items[0]).toMatchObject({ href: '/en/practice/legal-moves/challenge?piece=king' });
  });

  it('should generate challenge URL with piece parameter for route_planner', () => {
    const items = buildRequirementItems(
      [
        {
          type: 'challenge_score',
          menuType: 'route_planner',
          leaderboardKey: 'knight',
          minScore: 3,
        },
      ],
      'en',
      mockT
    );
    expect(items[0]).toMatchObject({ href: '/en/practice/route-planner/challenge?piece=knight' });
  });

  it('should generate standard practice URL for non-legal_moves', () => {
    const items = buildRequirementItems(
      [
        {
          type: 'challenge_score',
          menuType: 'square_colors',
          leaderboardKey: 'default',
          minScore: 15,
        },
      ],
      'en',
      mockT
    );
    expect(items[0]).toMatchObject({ href: '/en/practice/square-colors' });
  });

  it('should generate standard practice URL for legal_moves with default leaderboardKey', () => {
    const items = buildRequirementItems(
      [
        {
          type: 'challenge_score',
          menuType: 'legal_moves',
          leaderboardKey: 'default',
          minScore: 20,
        },
      ],
      'en',
      mockT
    );
    expect(items[0]).toMatchObject({ href: '/en/practice/legal-moves' });
  });

  it('should generate a single linked item for a memory-only requirement', () => {
    const items = buildRequirementItems(
      [{ type: 'position_submission_count', positionTypes: ['memory'], minCount: 1 }],
      'en',
      mockT
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      href: '/en/practice/position-memory/new',
      label: 'Submit 1 memory',
    });
  });

  it('should generate the puzzle URL for a puzzle-only requirement', () => {
    const items = buildRequirementItems(
      [{ type: 'position_submission_count', positionTypes: ['puzzle'], minCount: 1 }],
      'en',
      mockT
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ href: '/en/practice/puzzle/new' });
  });

  it('should split a memory-or-puzzle requirement into two linked items joined by an or divider', () => {
    const items = buildRequirementItems(
      [{ type: 'position_submission_count', positionTypes: ['memory', 'puzzle'], minCount: 1 }],
      'en',
      mockT
    );
    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({
      href: '/en/practice/position-memory/new',
      label: 'Submit 1 memory',
    });
    expect(items[1]).toEqual({ kind: 'or', label: 'or' });
    expect(items[2]).toMatchObject({
      href: '/en/practice/puzzle/new',
      label: 'Submit 1 puzzle',
    });
  });

  it('should generate the game setup URL and a peek-allowance note for game_publish_win_hidden_board', () => {
    const items = buildRequirementItems(
      [{ type: 'game_publish_win_hidden_board', minCount: 1, maxPeeks: 5 }],
      'en',
      mockT
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      href: '/en/games/new/standard',
      label: 'Keep the board hidden and win',
      note: 'Peeking allowed up to 5',
    });
  });
});

// ---------------------------------------------------------------------------
// buildRequirementLabels
// ---------------------------------------------------------------------------

describe('buildRequirementLabels', () => {
  const mockT = (key: string, values?: Record<string, string | number | Date>) => {
    if (key === 'gamePublishWin') return `Beat the engine ${values?.minCount}+ times`;
    if (key === 'gamePublishWinHiddenBoard') return `Keep the board hidden and win`;
    return key;
  };

  it('should return a plain label (no href) for game_publish_win', () => {
    expect(buildRequirementLabels({ type: 'game_publish_win', minCount: 1 }, mockT)).toEqual([
      'Beat the engine 1+ times',
    ]);
  });

  it('should return a plain label (no href) for game_publish_win_hidden_board', () => {
    expect(
      buildRequirementLabels(
        { type: 'game_publish_win_hidden_board', minCount: 1, maxPeeks: 5 },
        mockT
      )
    ).toEqual(['Keep the board hidden and win']);
  });
});

// ---------------------------------------------------------------------------
// buildPositionSubmissionLabels
// ---------------------------------------------------------------------------

describe('buildPositionSubmissionLabels', () => {
  const mockT = (key: string, values?: Record<string, string | number | Date>) => {
    if (key === 'orDivider') return 'or';
    if (key === 'submissionCount') return `Submit ${values?.minCount} ${values?.itemName}`;
    if (key.startsWith('submissionItemNames.')) return key.replace('submissionItemNames.', '');
    return key;
  };

  it('should return a single label for a one-type requirement', () => {
    const labels = buildPositionSubmissionLabels(
      { type: 'position_submission_count', positionTypes: ['memory'], minCount: 1 },
      mockT
    );
    expect(labels).toEqual(['Submit 1 memory']);
  });

  it('should join multiple types with an or divider entry, no href', () => {
    const labels = buildPositionSubmissionLabels(
      { type: 'position_submission_count', positionTypes: ['memory', 'puzzle'], minCount: 1 },
      mockT
    );
    expect(labels).toEqual(['Submit 1 memory', { kind: 'or', label: 'or' }, 'Submit 1 puzzle']);
  });
});

// ---------------------------------------------------------------------------
// getRankCardState
// ---------------------------------------------------------------------------

describe('getRankCardState', () => {
  // Common arguments helper
  const call = (overrides: {
    requirements?: ChallengeScoreRequirement[];
    isAchieved?: boolean;
    isRecommendedNext?: boolean;
  }) => {
    const defaults = {
      requirements: [
        {
          type: 'challenge_score' as const,
          menuType: 'square_colors',
          leaderboardKey: 'default',
          minScore: 15,
        },
      ],
      isAchieved: false,
      isRecommendedNext: false,
    };
    const args = { ...defaults, ...overrides };
    return getRankCardState(args.requirements, args.isAchieved, args.isRecommendedNext);
  };

  // --- "coming-soon" states ---

  it('should return "coming-soon" when requirements array is empty (not in DB, or conditions not yet defined)', () => {
    expect(call({ requirements: [] })).toBe('coming-soon');
  });

  it('"coming-soon" (empty requirements) takes priority over achieved state', () => {
    expect(call({ requirements: [], isAchieved: true })).toBe('coming-soon');
  });

  // --- Achievement / recommendation states ---

  it('should return "achieved" when the rank is achieved', () => {
    expect(call({ isAchieved: true })).toBe('achieved');
  });

  it('should return "next" for the recommended next rank', () => {
    expect(call({ isRecommendedNext: true })).toBe('next');
  });

  it('should return "unachieved" (plain, not the recommended next) otherwise — there is NO gate on lower ranks', () => {
    // Under skip-grants every defined rank is browsable and earnable; the
    // state only decides styling (recommended glow vs plain card).
    expect(call({})).toBe('unachieved');
  });

  it('should prefer "achieved" over the recommendation flag', () => {
    expect(call({ isAchieved: true, isRecommendedNext: true })).toBe('achieved');
  });

  it('should not return "coming-soon" for a rank with defined requirements (4kyu)', () => {
    const legalMovesRequirements: ChallengeScoreRequirement[] = [
      { type: 'challenge_score', menuType: 'legal_moves', leaderboardKey: 'bishop', minScore: 10 },
      { type: 'challenge_score', menuType: 'legal_moves', leaderboardKey: 'knight', minScore: 20 },
    ];
    expect(call({ requirements: legalMovesRequirements })).not.toBe('coming-soon');
  });
});

// ---------------------------------------------------------------------------
// isRankEarnedByPlaying
// ---------------------------------------------------------------------------

describe('isRankEarnedByPlaying', () => {
  const seeded = (slug: string) =>
    parseRequirements(ranksSeedData.find((r) => r.slug === slug)!.requirements);

  it('is false for the practice-drilled ranks', () => {
    // Asserted against the real seed rather than fixtures: the dojo CTA switches
    // on this, so a seed change that moves a rank between "drill it" and "play
    // it" should surface here.
    for (const slug of ['5kyu', '4kyu', '3kyu', '2kyu']) {
      expect(isRankEarnedByPlaying(seeded(slug)), slug).toBe(false);
    }
  });

  it('is true for 1kyu — earned at the board, not in practice/', () => {
    expect(isRankEarnedByPlaying(seeded('1kyu'))).toBe(true);
  });

  it('is true for 1dan — earned at the board, the board-hidden variant', () => {
    expect(isRankEarnedByPlaying(seeded('1dan'))).toBe(true);
  });

  it('is false for a rank with no requirements at all', () => {
    // "Coming Soon" ranks have nothing to earn, so they must not claim the
    // play-a-game CTA.
    expect(isRankEarnedByPlaying([])).toBe(false);
  });

  it('is false when a game requirement is mixed with a practice one', () => {
    expect(
      isRankEarnedByPlaying([
        { type: 'game_publish_win', minCount: 1 },
        {
          type: 'challenge_score',
          menuType: 'square_colors',
          leaderboardKey: 'default',
          minScore: 1,
        },
      ])
    ).toBe(false);
  });

  it('is true when both game-publish variants are present together', () => {
    expect(
      isRankEarnedByPlaying([
        { type: 'game_publish_win', minCount: 1 },
        { type: 'game_publish_win_hidden_board', minCount: 1, maxPeeks: 5 },
      ])
    ).toBe(true);
  });
});
