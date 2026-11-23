import 'server-only';

import { getUserLevel } from '@/lib/db/get-user-level';

import { isMaiaUnlockedAtLevel } from './maia-unlock-level';

/**
 * Maia engine access state for the `/games/new/*` engine selectors.
 *
 * - `level` — the viewer's current Exp level. At or above
 *             `MAIA_UNLOCK_LEVEL` the Maia card is selectable; below it the
 *             card renders locked.
 */
export type MaiaEngineAccess = {
  level: number;
};

/**
 * Maia model-download gate.
 *
 * Returns `true` when the user may fetch the 46 MB ONNX model from
 * `/api/engines/maia/[file]`: their level is at or above
 * `MAIA_UNLOCK_LEVEL`. Unauthenticated users always return `false`.
 *
 * This is the server-side enforcement — the route calls it before reading
 * the ONNX bytes off disk, so the 46 MB egress is unreachable for anonymous
 * and below-level callers. The page-level counterpart is
 * `getMaiaEngineAccess`, which hands the level itself to the engine selector
 * so its locked card can say how far off the viewer is.
 */
export async function canUseMaia(userId: string | null): Promise<boolean> {
  if (!userId) return false;
  return isMaiaUnlockedAtLevel(await getUserLevel(userId));
}

/**
 * Resolve Maia access state for the `/games/new/*` engine selectors.
 * Anonymous users get `{ level: 0 }` — the Maia card renders locked.
 */
export async function getMaiaEngineAccess(userId: string | null): Promise<MaiaEngineAccess> {
  if (!userId) return { level: 0 };
  return { level: await getUserLevel(userId) };
}
