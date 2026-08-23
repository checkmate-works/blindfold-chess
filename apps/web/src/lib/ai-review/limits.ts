/**
 * AI review generation limits — a plain module (no `server-only`, no runtime
 * dependencies) so the pricing UI can state the cap it enforces.
 */

/**
 * How many AI reviews one user may generate per day, whatever pays for them:
 * the cap sits behind the entitlement check, so a subscriber is bounded by it
 * exactly like a coin payer (see `requestAiReviewAction`).
 *
 * Named rather than inlined into `RATE_LIMITS` because this is the one number
 * that decides how much money the app spends: nothing counts LLM calls
 * system-wide, so (subscribers × this) is the daily ceiling. Anything that has
 * to state or reason about the limit — the pricing card's feature line, any
 * other UI notice — reads it from here instead of restating the digit, which
 * is also why this lives apart from the server-only limiter.
 *
 * See `RATE_LIMITS.generateAiReview` for why it currently sits this low.
 */
export const AI_REVIEW_GENERATIONS_PER_DAY = 3;
