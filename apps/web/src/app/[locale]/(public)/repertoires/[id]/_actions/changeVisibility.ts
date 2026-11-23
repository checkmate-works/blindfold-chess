'use server';

import type { ChangeRepertoireVisibilityResult } from '@/lib/repertoires/mutations';
import { changeRepertoireVisibility } from '@/lib/repertoires/mutations';
import type { RepertoireVisibility } from '@/lib/repertoires/visibility';

/**
 * Owner-only: change a Kata's visibility tier (public / followers-only /
 * private; see `changeRepertoireVisibility`). Revalidates the detail page (status badge) and
 * the /repertoires catalog (a course entering/leaving `public` appears or
 * disappears there).
 */
export async function changeVisibility(input: {
  id: string;
  target: RepertoireVisibility;
  locale: string;
}): Promise<ChangeRepertoireVisibilityResult> {
  const result = await changeRepertoireVisibility({
    repertoireId: input.id,
    target: input.target,
  });
  if ('success' in result) {
    // No revalidatePath: both routes are dynamic, and
    // `RepertoireVisibilityControl` calls `router.refresh()` on success.
  }
  return result;
}
