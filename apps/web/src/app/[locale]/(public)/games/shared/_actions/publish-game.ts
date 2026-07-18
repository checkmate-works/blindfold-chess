'use server';

import { refreshAdsHiddenCookieOnDanPromotion } from '@/lib/ads/ads-hidden-cookie-writer';
import { userHasProfile } from '@/lib/auth';
import type { GrantedRank } from '@/lib/db/data/ranks';
import { publishGame } from '@/lib/db/games-write';
import { evaluateRanksAfterCreate } from '@/lib/db/rank-evaluation';
import type { EngineConfig } from '@/lib/engines';
import { deriveGameColumns, validatePublishSnapshot } from '@/lib/games/publish-game';
import type { MoveOperationLog, PreferenceChangeLogEntry } from '@/lib/games/saved-game-types';
import { isUserBanned } from '@/lib/moderation/ban';
import { notifyFollowersOfNewGame } from '@/lib/notifications/notification';
import { guardByIpRateLimit } from '@/lib/security/rate-limit-ip';
import { handleServerActionError } from '@/lib/server-action-error';
import { createClient } from '@/lib/supabase/server';

import type { PerGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

export type PublishGameActionInput = {
  title: string;
  description?: string | null;
  moves: string[];
  startingFen?: string | null;
  /** Seeded setup-prefix length; validated to [1, moves.length] on the server. */
  setupPlies?: number | null;
  playerColor: 'white' | 'black';
  engineConfig: EngineConfig;
  result: 'win' | 'loss' | 'draw';
  operationLogs?: MoveOperationLog[] | null;
  /** Per-game blindfold settings snapshot; validated + subset on the server. */
  playSettings?: PerGamePreferences | null;
  /**
   * Mid-game per-game-preference edits (the full change log). The server
   * validates this down to the display-relevant subset (board visibility +
   * piece visibility/shape/color) so the replay can show what the player saw at
   * each position, not just at game start.
   */
  playSettingsLog?: PreferenceChangeLogEntry[] | null;
};

export type PublishGameResponse =
  | { success: true; id: string; manageToken?: string; grantedRanks?: GrantedRank[] }
  | { success: false; error: string };

/**
 * Server Action: publish a blindfold game to the public catalog.
 *
 * Open to account-less authors (the many sign-in-free players), so it gates on
 * IP rate limit rather than requiring auth. A signed-in author owns the game
 * via `author_id`; an account-less author gets a manage token returned for
 * client-side storage (their only handle to later unpublish / delete / claim).
 *
 * Anti-tamper: the snapshot is self-reported but move legality is re-verified
 * and all denormalized columns are recomputed server-side (see
 * {@link validatePublishSnapshot} / {@link deriveGameColumns}).
 */
export async function publishGameAction(
  input: PublishGameActionInput
): Promise<PublishGameResponse> {
  try {
    const limited = await guardByIpRateLimit('publishGame');
    if (limited) {
      return { success: false, error: limited.error };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user && (await isUserBanned(user.id))) {
      return { success: false, error: 'forbidden' };
    }

    // A provisional author (signed in but no profile / username yet) is treated
    // as anonymous: publishing is open to account-less players anyway, and an
    // unprofiled author id would only render as "(deleted user)" on the shared
    // page. They get a manage token like any account-less author instead.
    const authorId = user && (await userHasProfile(user.id)) ? user.id : null;

    const validated = validatePublishSnapshot(input);
    if (!validated.ok) {
      return { success: false, error: validated.error };
    }

    const columns = deriveGameColumns(validated.game);
    const { id, manageToken } = await publishGame({
      authorId,
      game: validated.game,
      columns,
    });

    // Notify followers (registered authors only — the feed item + followers
    // are actor-keyed). Fire-and-forget inside the helper.
    if (authorId) {
      notifyFollowersOfNewGame({ actorId: authorId, gameId: id });
    }

    // 1kyu is earned by publishing a won, constrained game, so the publish is
    // the trigger — there is no challenge to hang it off. Runs after
    // `publishGame`'s transaction so the row just written counts, and only for
    // a real author: an account-less (or provisional) publisher has no user to
    // grant a rank to. Such a game starts counting once its author claims it
    // via the manage token — `claimSharedGameAction` re-evaluates on claim.
    const grantedRanks = authorId ? await evaluateRanksAfterCreate(authorId, 'game publish') : [];
    await refreshAdsHiddenCookieOnDanPromotion(grantedRanks);

    return {
      success: true,
      id,
      manageToken,
      ...(grantedRanks.length > 0 ? { grantedRanks } : {}),
    };
  } catch (error) {
    return handleServerActionError(error, '[publishGameAction]');
  }
}
