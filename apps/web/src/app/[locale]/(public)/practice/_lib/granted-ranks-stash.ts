import type { GrantedRank } from '@/lib/db/data/ranks';

import { SESSION_STORAGE_KEYS } from './session-storage-keys';

/**
 * sessionStorage hand-off for belt-rank grants.
 *
 * A grant fires on the server mid-flow (challenge save, position submission,
 * game publish), but the celebration is shown by `RankAchievementModal` on
 * whatever page the flow navigates to next. The writer stashes the grants
 * right before navigating; the modal takes them on mount. These two functions
 * are the only code that should touch the underlying key — they keep the
 * payload shape (a JSON `GrantedRank[]`) a private contract between them.
 */
export function stashGrantedRanks(grantedRanks: GrantedRank[] | undefined): void {
  if (!grantedRanks || grantedRanks.length === 0) return;
  sessionStorage.setItem(SESSION_STORAGE_KEYS.GRANTED_RANKS, JSON.stringify(grantedRanks));
}

/**
 * Read and clear the stashed grants — clearing makes the celebration
 * once-only across reloads. Returns `[]` when nothing was stashed or the
 * payload is unreadable.
 */
export function takeGrantedRanks(): GrantedRank[] {
  const stored = sessionStorage.getItem(SESSION_STORAGE_KEYS.GRANTED_RANKS);
  if (!stored) return [];
  sessionStorage.removeItem(SESSION_STORAGE_KEYS.GRANTED_RANKS);
  try {
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed) ? (parsed as GrantedRank[]) : [];
  } catch {
    return [];
  }
}
