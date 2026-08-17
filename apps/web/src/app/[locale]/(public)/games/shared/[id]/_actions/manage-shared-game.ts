'use server';

import { getOptionalUser } from '@/lib/auth';
import { authorizeGameMutation } from '@/lib/db/games-auth';
import { softDeleteSharedGame, updateSharedGameFields } from '@/lib/db/games-write';
import { MAX_DESCRIPTION_LENGTH, MAX_TITLE_LENGTH } from '@/lib/games/publish-constants';
import { handleServerActionError } from '@/lib/server-action-error';
import { UUID_RE } from '@/lib/validations/uuid';

export type ManageSharedGameResponse = { success: true } | { success: false; error: string };

export type UpdateSharedGameInput = {
  gameId: string;
  title: string;
  description?: string | null;
  /** Manage token for account-less owners; omitted for registered authors. */
  token?: string;
};

/** Resolve the current session user once for an owner mutation. */
async function currentUserId(): Promise<string | null> {
  const user = await getOptionalUser();
  return user?.id ?? null;
}

/**
 * Owner soft-delete of a shared game. Authorized by session author_id OR the
 * account-less manage token; the game then drops out of all public reads.
 */
export async function deleteSharedGameAction(
  gameId: string,
  token?: string
): Promise<ManageSharedGameResponse> {
  try {
    if (typeof gameId !== 'string' || !UUID_RE.test(gameId)) {
      return { success: false, error: 'invalid_input' };
    }

    const auth = await authorizeGameMutation({
      gameId,
      userId: await currentUserId(),
      token: token ?? null,
    });
    if (auth !== 'ok') return { success: false, error: auth };

    await softDeleteSharedGame(gameId);
    return { success: true };
  } catch (error) {
    return handleServerActionError(error, '[deleteSharedGameAction]');
  }
}

/**
 * Owner edit of a shared game's title / description. The immutable game snapshot
 * (moves, engine, result) is never touched here.
 */
export async function updateSharedGameAction(
  input: UpdateSharedGameInput
): Promise<ManageSharedGameResponse> {
  try {
    const { gameId } = input;
    if (typeof gameId !== 'string' || !UUID_RE.test(gameId)) {
      return { success: false, error: 'invalid_input' };
    }

    const title = typeof input.title === 'string' ? input.title.trim() : '';
    if (title.length === 0 || title.length > MAX_TITLE_LENGTH) {
      return { success: false, error: 'invalid_title' };
    }

    let description: string | null = null;
    if (input.description != null) {
      if (typeof input.description !== 'string')
        return { success: false, error: 'invalid_description' };
      const trimmed = input.description.trim();
      if (trimmed.length > MAX_DESCRIPTION_LENGTH)
        return { success: false, error: 'invalid_description' };
      description = trimmed.length > 0 ? trimmed : null;
    }

    const auth = await authorizeGameMutation({
      gameId,
      userId: await currentUserId(),
      token: input.token ?? null,
    });
    if (auth !== 'ok') return { success: false, error: auth };

    await updateSharedGameFields(gameId, { title, description });
    return { success: true };
  } catch (error) {
    return handleServerActionError(error, '[updateSharedGameAction]');
  }
}
