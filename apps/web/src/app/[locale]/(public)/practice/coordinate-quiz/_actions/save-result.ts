'use server';

import { db } from '@/lib/db';
import type { CoordinateQuizResult, CoordinateQuizSettings } from '@/lib/db/practice-session-types';
import { practiceSessions } from '@/lib/db/schema';
import { createClient } from '@/lib/supabase/server';

type SaveCoordinateQuizResultInput = {
  correctAnswers: number;
  incorrectAnswers: number;
  timeTaken: number;
  timeLimit: number;
  boardOrientation: string;
  mistakeAllowance: number;
};

export type SaveResultResponse = {
  success: boolean;
  id?: string;
};

export async function saveCoordinateQuizResult(
  input: SaveCoordinateQuizResultInput
): Promise<SaveResultResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false };
    }

    const settings: CoordinateQuizSettings = {
      timeLimit: input.timeLimit,
      boardOrientation: input.boardOrientation,
      mistakeAllowance: input.mistakeAllowance,
    };

    const result: CoordinateQuizResult = {
      correctAnswers: input.correctAnswers,
      incorrectAnswers: input.incorrectAnswers,
      timeTaken: input.timeTaken,
    };

    const [inserted] = await db
      .insert(practiceSessions)
      .values({
        userId: user.id,
        menuType: 'coordinate_quiz',
        settings,
        result,
      })
      .returning({ id: practiceSessions.id });

    return { success: true, id: inserted.id };
  } catch (error) {
    console.error('Failed to save coordinate-quiz result:', error);
    return { success: false };
  }
}
