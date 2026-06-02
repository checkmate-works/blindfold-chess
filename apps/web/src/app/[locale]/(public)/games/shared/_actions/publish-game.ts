'use server';

import { publishGame } from '@/lib/db/games';
import type { EngineConfig } from '@/lib/engines';
import { deriveGameColumns, validatePublishSnapshot } from '@/lib/games/publish-game';
import type { MoveOperationLog } from '@/lib/games/saved-game-types';
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
  playerColor: 'white' | 'black';
  engineConfig: EngineConfig;
  result: 'win' | 'loss' | 'draw';
  operationLogs?: MoveOperationLog[] | null;
  /** Per-game blindfold settings snapshot; validated + subset on the server. */
  playSettings?: PerGamePreferences | null;
};

export type PublishGameResponse =
  | { success: true; id: string; manageToken?: string }
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

    const validated = validatePublishSnapshot(input);
    if (!validated.ok) {
      return { success: false, error: validated.error };
    }

    const columns = deriveGameColumns(validated.game);
    const { id, manageToken } = await publishGame({
      authorId: user?.id ?? null,
      game: validated.game,
      columns,
    });

    // Notify followers (registered authors only — the feed item + followers
    // are actor-keyed). Fire-and-forget inside the helper.
    if (user?.id) {
      notifyFollowersOfNewGame({ actorId: user.id, gameId: id });
    }

    return { success: true, id, manageToken };
  } catch (error) {
    return handleServerActionError(error, '[publishGameAction]');
  }
}
