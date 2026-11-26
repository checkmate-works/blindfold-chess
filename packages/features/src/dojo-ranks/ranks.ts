/**
 * The dojo's belt ranks (無級 → 5級 … 1級 → 初段): their order, belt colours
 * and what each one asks for, as plain data both apps can read.
 *
 * @description
 * The server grants ranks (it evaluates the requirements after a challenge
 * result is written, a position is posted or a game is published) and stores
 * only the ranks a user holds. What a client needs to draw the dojo — the
 * ladder, the colour of each belt, the list of requirements and which rank
 * comes next — is fixed data, so it lives here instead of being fetched.
 *
 * The web seeds the `ranks` table from its own copy of these requirements
 * (`apps/web/src/lib/db/data/ranks.ts`, which also holds the parsers for the
 * jsonb column). A test there compares that seed with {@link RANK_REQUIREMENTS}
 * so the two cannot drift apart silently.
 *
 * Mukyu (無級) is the rank every user holds before earning one. It is never
 * stored or granted and has no requirements; it is in {@link RANK_SLUGS} so
 * the ladder can start from it.
 */

/** Every rank, lowest first, starting from the unranked state. */
export const RANK_SLUGS = [
  "mukyu",
  "5kyu",
  "4kyu",
  "3kyu",
  "2kyu",
  "1kyu",
  "1dan",
] as const;

export type RankSlug = (typeof RANK_SLUGS)[number];

/** The unranked state every user starts in. */
export const MUKYU_SLUG = "mukyu" satisfies RankSlug;

/** The ranks that are earned (everything but mukyu), lowest first. */
export const EARNED_RANK_SLUGS = RANK_SLUGS.filter(
  (slug): slug is Exclude<RankSlug, typeof MUKYU_SLUG> => slug !== MUKYU_SLUG,
);

export type EarnedRankSlug = Exclude<RankSlug, typeof MUKYU_SLUG>;

/**
 * The belt colour of each rank as a hex value. Mukyu is white, so anything
 * drawing it on a light surface needs an outline to stay visible.
 */
export const BELT_COLOR_HEX: Readonly<Record<RankSlug, string>> = {
  mukyu: "#ffffff",
  "5kyu": "#f97316",
  "4kyu": "#3b82f6",
  "3kyu": "#eab308",
  "2kyu": "#22c55e",
  "1kyu": "#92400e",
  "1dan": "#1c1917",
};

/** The best score in one challenge leaderboard must reach `minScore`. */
export type ChallengeScoreRequirement = {
  readonly type: "challenge_score";
  /** The challenge module (`square_colors`, `legal_moves`, …). */
  readonly menuType: string;
  /** The leaderboard within the module (`default`, `white`, `knight`, …). */
  readonly leaderboardKey: string;
  readonly minScore: number;
};

/** At least `minCount` posted positions of any of `positionTypes` in total. */
export type PositionSubmissionCountRequirement = {
  readonly type: "position_submission_count";
  readonly positionTypes: readonly ("memory" | "puzzle")[];
  readonly minCount: number;
};

/** At least `minCount` published won engine games played under a blindfold constraint. */
export type GamePublishWinRequirement = {
  readonly type: "game_publish_win";
  readonly minCount: number;
};

/**
 * At least `minCount` published won engine games with the board hidden for
 * the whole game and at most `maxPeeks` peeks.
 */
export type GamePublishWinHiddenBoardRequirement = {
  readonly type: "game_publish_win_hidden_board";
  readonly minCount: number;
  readonly maxPeeks: number;
};

export type RankRequirement =
  | ChallengeScoreRequirement
  | PositionSubmissionCountRequirement
  | GamePublishWinRequirement
  | GamePublishWinHiddenBoardRequirement;

/** What each earned rank asks for. All of a rank's requirements must be met. */
export const RANK_REQUIREMENTS: Readonly<
  Record<EarnedRankSlug, readonly RankRequirement[]>
> = {
  "5kyu": [
    {
      type: "challenge_score",
      menuType: "square_colors",
      leaderboardKey: "default",
      minScore: 15,
    },
    {
      type: "challenge_score",
      menuType: "coordinate_quiz",
      leaderboardKey: "white",
      minScore: 20,
    },
  ],
  "4kyu": [
    {
      type: "challenge_score",
      menuType: "legal_moves",
      leaderboardKey: "king",
      minScore: 20,
    },
    {
      type: "challenge_score",
      menuType: "legal_moves",
      leaderboardKey: "knight",
      minScore: 20,
    },
    {
      type: "challenge_score",
      menuType: "legal_moves",
      leaderboardKey: "bishop",
      minScore: 10,
    },
  ],
  "3kyu": [
    {
      type: "challenge_score",
      menuType: "route_planner",
      leaderboardKey: "knight",
      minScore: 3,
    },
    {
      type: "challenge_score",
      menuType: "route_planner",
      leaderboardKey: "bishop",
      minScore: 3,
    },
  ],
  "2kyu": [
    {
      type: "position_submission_count",
      positionTypes: ["memory", "puzzle"],
      minCount: 1,
    },
  ],
  "1kyu": [{ type: "game_publish_win", minCount: 1 }],
  "1dan": [{ type: "game_publish_win_hidden_board", minCount: 1, maxPeeks: 5 }],
};

export function isRankSlug(value: unknown): value is RankSlug {
  return (RANK_SLUGS as readonly unknown[]).includes(value);
}

/**
 * Where a rank stands for a player whose highest rank is `highest`:
 * `achieved` for it and every rank below it (ranks can be granted out of
 * order, but the dojo reads the highest one as covering the ladder below),
 * `next` for the one right above it, `locked` for the rest.
 */
export type RankStanding = "achieved" | "next" | "locked";

export function rankStanding(
  slug: RankSlug,
  highest: RankSlug | undefined,
): RankStanding {
  const index = RANK_SLUGS.indexOf(slug);
  const highestIndex = RANK_SLUGS.indexOf(highest ?? MUKYU_SLUG);
  if (index <= highestIndex) return "achieved";
  return index === highestIndex + 1 ? "next" : "locked";
}

/** The rank to aim for next, or undefined once 初段 (the top) is held. */
export function nextRankSlug(
  highest: RankSlug | undefined,
): EarnedRankSlug | undefined {
  const next = RANK_SLUGS[RANK_SLUGS.indexOf(highest ?? MUKYU_SLUG) + 1];
  return next === undefined || next === MUKYU_SLUG ? undefined : next;
}

/** How many of the earned ranks are covered by `highest`. */
export function achievedRankCount(highest: RankSlug | undefined): number {
  return RANK_SLUGS.indexOf(highest ?? MUKYU_SLUG);
}

/**
 * Whether a requirement can be met inside the mobile app. Challenge scores
 * can (the timed challenges record to the server when signed in); posting
 * positions and publishing games happen on the web only.
 */
export function isRequirementPlayableOnMobile(
  requirement: RankRequirement,
): boolean {
  return requirement.type === "challenge_score";
}
