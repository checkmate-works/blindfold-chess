import {
  COUNTDOWN_INITIAL_VALUE,
  COUNTDOWN_START_DISPLAY_DURATION,
  COUNTDOWN_STEP_DURATION,
} from "../common/countdown";

/**
 * Version of the rules an attempt row was played under, stored on the row.
 *
 * Bump it whenever question generation, the clock rules, or any tolerance
 * below changes in a way that alters how a stored row should be read. Old
 * rows keep the version they were played under, so a reader can tell which
 * rules produced a given score, thinking time or refusal instead of
 * re-interpreting history under rules that did not exist when it was played.
 */
export const CHALLENGE_RULES_VERSION = 2;

/**
 * How long the client's pre-start countdown runs (3, 2, 1, "START!").
 *
 * Derived from the countdown's own constants so the server clock stays in
 * step with what the player sees: the first question's clock must not start
 * while the countdown is still on screen.
 */
export const COUNTDOWN_TOTAL_MS =
  COUNTDOWN_INITIAL_VALUE * COUNTDOWN_STEP_DURATION +
  COUNTDOWN_START_DISPLAY_DURATION;

/**
 * Extra delay before the first question's clock starts, on top of the
 * countdown.
 *
 * Allows for the start response's trip to the client and for the client
 * beginning its countdown slightly after the server recorded the start, so a
 * player is not charged for time in which the question was not yet visible.
 */
export const START_GRACE_MS = 300;

/**
 * How far before the clock resumes an answer may arrive and still count.
 *
 * The client starts showing the next question when its feedback flash ends,
 * which the server can only estimate. Up/down latency jitter makes an honest
 * answer occasionally land a little before the server's resume time; anything
 * earlier than this tolerance was sent while the feedback flash was still on
 * screen and is rejected.
 */
export const EARLY_ANSWER_TOLERANCE_MS = 150;

/**
 * How far past the time limit an answer may arrive and still count.
 *
 * An answer pressed just before the client's clock hit zero reaches the
 * server slightly later; this absorbs that latency jitter. Anything later is
 * reported as expired and not counted.
 */
export const END_TOLERANCE_MS = 150;

/**
 * How long after the start an attempt row stays usable.
 *
 * A 60-second challenge with countdown and feedback flashes ends well within
 * this; a row older than this was abandoned, so answers and finish requests
 * against it are rejected instead of being scored late.
 */
export const ATTEMPT_MAX_AGE_MS = 600_000;

/**
 * Minimum number of answers before the mean-thinking-time check applies.
 *
 * The check refuses to record a run whose server-measured mean thinking time
 * is below the module's floor, which keeps zero-thinking-time automated runs
 * off the leaderboard. The threshold is kept this low on purpose: a high
 * threshold would let a bot escape the check simply by answering only a few
 * questions very fast. Below five answers the mean is too noisy to judge a
 * human by (one lucky instant answer would dominate it).
 */
export const MIN_ANSWERS_FOR_SPEED_CHECK = 5;
