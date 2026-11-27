/**
 * The dojo's belt ranks (無級 → 5級 … 1級 → 初段): their order, belt colours
 * and what each one asks for, as plain data both apps can read.
 *
 * @description
 * The server grants ranks (it evaluates the requirements after a challenge
 * result is written, an exam problem is passed or a game is published) and
 * stores only the ranks a user holds. What a client needs to draw the dojo — the
 * ladder, the colour of each belt, the list of requirements and which rank
 * comes next — is fixed data, so it lives here instead of being fetched.
 *
 * The web seeds the `ranks` table from these requirements
 * (`apps/web/src/lib/db/data/ranks.ts` keeps the level metadata and parsers
 * for the jsonb column). Both apps therefore use the same requirement types
 * and thresholds.
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

/**
 * The `ranks.challengeNames.*` message key of a challenge leaderboard: the
 * module alone for its default board (`square_colors`), the module and the
 * board otherwise (`legal_moves_king`). The web and the app name a
 * `challenge_score` requirement, and the app its next challenge step, with
 * this key, so a new leaderboard needs one message entry per dictionary.
 */
export function challengeNameKey(
  menuType: string,
  leaderboardKey: string,
): string {
  return leaderboardKey === "default"
    ? menuType
    : `${menuType}_${leaderboardKey}`;
}

/**
 * The kinds of exam problem a rank can set, in the order an exam lists them.
 * The URL segments, the problem lists and the request guards all read this
 * one list, so a kind added here reaches every one of them.
 */
export const EXAM_PROBLEM_KINDS = ["position_memory", "puzzle"] as const;

export type ExamProblemKind = (typeof EXAM_PROBLEM_KINDS)[number];

export function isExamProblemKind(value: unknown): value is ExamProblemKind {
  return (EXAM_PROBLEM_KINDS as readonly unknown[]).includes(value);
}

/**
 * Requires the user to have passed one problem of a rank's exam: recreating a
 * fixed position from memory (`position_memory`) or solving a fixed puzzle
 * (`puzzle`). The problems themselves are constants in the `dojo-journey`
 * module, so the web, the app and the server read the same ones.
 *
 * Passing is never self-reported. The server grades the answer with the
 * shared grader and records the pass itself; a client cannot claim it. That
 * is also what makes the requirement meetable from the app.
 *
 * 2kyu used to ask for posting a position-memory problem or a puzzle. It asks
 * for these two exam problems instead, for three reasons: the rank has one
 * condition on every platform (the app no longer substitutes an exam of its
 * own and the web no longer needs a branch for posts), a rank should not make
 * the user create content for others, and a retired requirement type left in
 * the union would read as one that is still in force — so the posting type was
 * removed outright rather than kept unused.
 */
export type ExamProblemRequirement = {
  readonly type: "exam_problem";
  /** The rank whose exam the problem belongs to. */
  readonly exam: EarnedRankSlug;
  readonly problem: ExamProblemKind;
};

/**
 * Requires the user to have published at least one WON game against the engine
 * that was played under some blindfold constraint.
 *
 * Checked against `games` (every row there is an engine game — there is no
 * human-vs-human path into that table), so engine kind and strength are
 * deliberately not part of the condition: the rank is about playing without
 * full sight, not about beating a particular rating.
 *
 * "Under a constraint" is judged on the start-of-game settings snapshot alone —
 * see {@link isConstrainedPlaySettings}, which owns that predicate.
 *
 * The win is self-reported. `games.result` is not verified server-side (a game
 * can end in resignation or timeout, which a final-position check cannot
 * confirm — publish-time integrity is move legality, not outcome), so this
 * requirement inherits that posture.
 */
export type GamePublishWinRequirement = {
  readonly type: "game_publish_win";
  readonly minCount: number;
};

/**
 * Requires the user to have published at least `minCount` WON games against
 * the engine that stayed under a blindfold constraint for the ENTIRE game,
 * with peeking capped at `maxPeeks`.
 *
 * Stricter than {@link GamePublishWinRequirement} in two ways:
 * - "Hidden" is judged on `boardVisibility` specifically (not the full
 *   {@link isConstrainedPlaySettings} constraint set), and it must hold at
 *   the start AND stay that way the whole game — checked against the
 *   self-reported `games.play_settings_log`, not just the start snapshot.
 *   See {@link maintainedHiddenBoard}, which owns that predicate.
 * - The game's peek total must not exceed `maxPeeks`. The count comes from
 *   `games.operation_totals.peeks` — the monotonic lifetime counter that
 *   undo cannot shrink, so peek → undo → replay counts every peek
 *   (issue #95). Legacy rows without totals fall back to summing the
 *   per-move `operationLogs`, but qualify only when they also record zero
 *   undos: undo deletes log lines together with their peekCount, so a
 *   legacy game with any undo has an unverifiable peek total (fail closed).
 *
 * Like `game_publish_win`, this inherits the app's self-reported posture:
 * `games.result`, `play_settings_log`, `operation_logs`, and
 * `operation_totals` are all trusted as-is (only move legality is verified
 * server-side at publish time).
 */
export type GamePublishWinHiddenBoardRequirement = {
  readonly type: "game_publish_win_hidden_board";
  readonly minCount: number;
  readonly maxPeeks: number;
};

export type RankRequirement =
  | ChallengeScoreRequirement
  | ExamProblemRequirement
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
    { type: "exam_problem", exam: "2kyu", problem: "position_memory" },
    { type: "exam_problem", exam: "2kyu", problem: "puzzle" },
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

/**
 * The rank right below `slug`, or undefined below mukyu. For an earned rank
 * it is always defined (mukyu for 5kyu): the rank a player has to hold before
 * a pass at `slug`'s exam is recorded.
 */
export function previousRankSlug(slug: EarnedRankSlug): RankSlug;
export function previousRankSlug(slug: RankSlug): RankSlug | undefined;
export function previousRankSlug(slug: RankSlug): RankSlug | undefined {
  return RANK_SLUGS[RANK_SLUGS.indexOf(slug) - 1];
}

/** How many of the earned ranks are covered by `highest`. */
export function achievedRankCount(highest: RankSlug | undefined): number {
  return RANK_SLUGS.indexOf(highest ?? MUKYU_SLUG);
}

/**
 * Whether a requirement can be met inside the mobile app. Challenge scores
 * can (the timed challenges record to the server when signed in), and so can
 * exam problems (the app sends the answer and the server grades it);
 * publishing games happens on the web only.
 */
export function isRequirementPlayableOnMobile(
  requirement: RankRequirement,
): boolean {
  return (
    requirement.type === "challenge_score" ||
    requirement.type === "exam_problem"
  );
}
