import 'server-only';

import { canGenerateAiReview } from '@/lib/ai-review/authorize';
import type { AiReviewGenerationState } from '@/lib/ai-review/types';
import { hasActiveSubscription } from '@/lib/billing/subscription';
import type { GameRecord } from '@/lib/db/schema';
import { AI_REVIEW_POINT_COST, getPointBalanceSummary } from '@/lib/points';

/**
 * THE single gate for generating (not viewing) an AI review — every caller
 * that decides whether generation may happen goes through this function, and
 * no caller re-implements part of it.
 *
 * It is the composition of two independent tests, kept separate because they
 * answer different questions and fail for different reasons (see
 * `AiReviewGenerationState`):
 *
 *  1. **Eligibility** — `canGenerateAiReview`, pure and synchronous: is this
 *     viewer the game's author, and is the game long enough to coach?
 *  2. **Entitlement** — this function: what pays for the LLM call? A
 *     subscription (`allowed`, no charge) or `AI_REVIEW_POINT_COST` coins
 *     (`payable`); with neither, `insufficient_balance`.
 *
 * @design Why generation is paid at all
 * Every generation is an uncached OpenAI call over a whole game, billed per
 * token, and it is the only path in the app that can spend on an external API
 * on a user's say-so. Left open to every member, cost would scale with signup
 * count rather than with revenue. The coin price ties each generation to
 * something the author earned (likes on their published work) or bought (a
 * subscription); the daily per-user rate limit (`RATE_LIMITS.generateAiReview`)
 * stays on as the abuse backstop behind it.
 *
 * @design Coins, not the ad-free set
 * Ad-free access is broader than a subscription on purpose — a dan-tier belt
 * or a coin grant also removes ads (`hasAdFreeEntitlement`) — because ads cost
 * the *user* attention, not the operator money. Review generation is the
 * opposite: it costs real money per use, so it deliberately does NOT reuse
 * that entitlement. A dan holder with no subscription pays the coin like
 * anyone else. Do not "unify" the two checks.
 *
 * @design Reading stays free
 * Only generation is gated. A review, once it exists, is served to every
 * visitor of the shared game — it is public content about a public game, and
 * paywalling the read would retroactively hide something its author published.
 * The Server Action returns a cached review before this gate is consulted for
 * exactly that reason.
 *
 * The balance read here is advisory — it picks which offer the page renders.
 * The charge itself re-checks under a row lock inside the accept transaction
 * (`chargeAiReview`), so a balance spent between page load and click fails
 * there, never here.
 *
 * @param viewerId the authenticated viewer, or null when signed out.
 */
export async function resolveAiReviewGenerationState(
  game: GameRecord,
  viewerId: string | null
): Promise<AiReviewGenerationState> {
  const eligible = canGenerateAiReview(game, viewerId);
  if (!eligible.ok) {
    return { kind: 'blocked', reason: eligible.reason };
  }
  if (await hasActiveSubscription(eligible.authorId)) {
    return { kind: 'allowed' };
  }
  const { total: balance } = await getPointBalanceSummary(eligible.authorId);
  const cost = AI_REVIEW_POINT_COST;
  return balance >= cost
    ? { kind: 'payable', cost, balance }
    : { kind: 'insufficient_balance', cost, balance };
}
