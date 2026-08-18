import type { GrantedRank } from '@/lib/db/data/ranks';

/**
 * What every challenge module's save action answers with.
 *
 * A discriminated union, so a caller that has not checked `success` cannot
 * reach `grantedRanks`. `use-challenge-result-save.ts` used to declare its own
 * flattened copy (`success: boolean; error?: string`), which let the error be
 * read on a successful save and the ranks on a failed one, and restated the
 * `GrantedRank` shape inline while it was at it.
 *
 * Lives in a plain module rather than beside the action: a `"use server"` file
 * may only export async functions, so a type declared there can be imported
 * but is easy to turn into a forbidden re-export later.
 */
export type SaveResultResponse =
  | {
      success: true;
      grantedRanks?: GrantedRank[];
      /**
       * ID of the challenge_results row just inserted. Passed to the result
       * page as `?grant=<id>` so the page can refetch the granted EXP event
       * server-side (see `getExpInfoBySource`).
       */
      challengeResultId?: string;
    }
  | { success: false; error: string };
