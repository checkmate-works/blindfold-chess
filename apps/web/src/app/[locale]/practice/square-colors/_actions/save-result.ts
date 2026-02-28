'use server';

import { db } from '@/lib/db';
import type { SquareColorsResult, SquareColorsSettings } from '@/lib/db/practice-session-types';
import { practiceSessions } from '@/lib/db/schema';
import { createClient } from '@/lib/supabase/server';

type SaveSquareColorsResultInput = {
  correctAnswers: number;
  totalQuestions: number;
  incorrectAnswers: number;
  accuracy: number;
  timeTaken: number;
  averageTime: number;
  timeLimit: number;
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
      timeLimit: input.timeLimit,
      mode: 'timed',
    };

    const result: SquareColorsResult = {
      correctAnswers: input.correctAnswers,
      totalQuestions: input.totalQuestions,
      incorrectAnswers: input.incorrectAnswers,
      accuracy: input.accuracy,
      timeTaken: input.timeTaken,
      averageTime: input.averageTime,
      durationMs: Math.round(input.timeTaken * 1000),
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
