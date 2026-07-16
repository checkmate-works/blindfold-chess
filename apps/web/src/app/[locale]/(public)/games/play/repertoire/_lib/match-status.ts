import type { LineMatchStatus } from '@blindfold-chess/features/chess-core';

/** A kata verdict for a repertoire the game actually entered. */
export type MatchStatus = Exclude<LineMatchStatus, 'not-applicable'>;

/** Badge tint per verdict, shared by the picker list and the replay header. */
export const MATCH_STATUS_BADGE: Record<MatchStatus, string> = {
  'in-book': 'bg-success/15 text-success',
  deviation: 'bg-destructive/15 text-destructive',
  gap: 'bg-warning/15 text-warning',
};

/** i18n key suffix under `play.repertoireCheck.status` per verdict. */
export const MATCH_STATUS_KEY: Record<MatchStatus, string> = {
  'in-book': 'inBook',
  deviation: 'deviation',
  gap: 'gap',
};
