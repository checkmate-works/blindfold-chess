'use server';

import { db } from '@/lib/db';
import type { SquareColorsResult, SquareColorsSettings } from '@/lib/db/practice-session-types';
import { practiceSessions } from '@/lib/db/schema';
import { createClient } from '@/lib/supabase/server';

type SaveSquareColorsResultInput = {
  correctAnswers: number;
  incorrectAnswers: number;
  timeTaken: number;
  mistakeAllowance: number;
};

export type SaveResultResponse = {
  success: boolean;
  id?: string;
};

export async function saveSquareColorsResult(
  input: SaveSquareColorsResultInput
): Promise<SaveResultResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false };
    }

    const settings: SquareColorsSettings = {
      timeLimit: 60,
      mistakeAllowance: input.mistakeAllowance,
    };

    const result: SquareColorsResult = {
      correctAnswers: input.correctAnswers,
      incorrectAnswers: input.incorrectAnswers,
      timeTaken: input.timeTaken,
    };

    const [inserted] = await db
      .insert(practiceSessions)
      .values({
        userId: user.id,
        menuType: 'square_colors',
        settings,
        result,
      })
      .returning({ id: practiceSessions.id });

    return { success: true, id: inserted.id };
  } catch (error) {
    console.error('Failed to save square-colors result:', error);
    return { success: false };
  }
}
