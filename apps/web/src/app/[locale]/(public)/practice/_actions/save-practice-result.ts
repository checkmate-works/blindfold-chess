'use server';

import { db } from '@/lib/db';
import type { PracticeMenuType } from '@/lib/db/practice-session-types';
import { practiceSessions } from '@/lib/db/schema';
import { createClient } from '@/lib/supabase/server';

export type SaveResultResponse = {
  success: boolean;
  id?: string;
};

export async function savePracticeResult(
  menuType: PracticeMenuType,
  settings: Record<string, unknown>,
  result: Record<string, unknown>
): Promise<SaveResultResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false };
    }

    const [inserted] = await db
      .insert(practiceSessions)
      .values({
        userId: user.id,
        menuType,
        settings,
        result,
      })
      .returning({ id: practiceSessions.id });

    return { success: true, id: inserted.id };
  } catch (error) {
    console.error(`Failed to save ${menuType} result:`, error);
    return { success: false };
  }
}
