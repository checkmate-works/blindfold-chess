'use server';

import { db } from '@/lib/db';
import type { LegalMovesResult, LegalMovesSettings } from '@/lib/db/practice-session-types';
import { practiceSessions } from '@/lib/db/schema';
import { createClient } from '@/lib/supabase/server';

type SaveLegalMovesResultInput = {
  correctAnswers: number;
  incorrectAnswers: number;
  timeTaken: number;
  timeLimit: number;
  selectedPieces: string[];
  mistakeAllowance: number;
};

export type SaveResultResponse = {
  success: boolean;
  id?: string;
};

export async function saveLegalMovesResult(
  input: SaveLegalMovesResultInput
): Promise<SaveResultResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false };
    }

    const settings: LegalMovesSettings = {
      timeLimit: input.timeLimit,
      selectedPieces: input.selectedPieces,
      mistakeAllowance: input.mistakeAllowance,
    };

    const result: LegalMovesResult = {
      correctAnswers: input.correctAnswers,
      incorrectAnswers: input.incorrectAnswers,
      timeTaken: input.timeTaken,
    };

    const [inserted] = await db
      .insert(practiceSessions)
      .values({
        userId: user.id,
        menuType: 'legal_moves',
        settings,
        result,
      })
      .returning({ id: practiceSessions.id });

    return { success: true, id: inserted.id };
  } catch (error) {
    console.error('Failed to save legal-moves result:', error);
    return { success: false };
  }
}
