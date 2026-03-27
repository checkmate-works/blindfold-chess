// Interview question definitions for user profile interviews.
// The initial scope covers a single question ("favorite_opening"),
// with the design accommodating future additions.

export const INTERVIEW_QUESTION_KEYS = ['favorite_opening'] as const;
export type InterviewQuestionKey = (typeof INTERVIEW_QUESTION_KEYS)[number];

export const QUESTION_CONFIG: Record<
  InterviewQuestionKey,
  { answerType: 'master_ref' | 'choice' | 'free_text' }
> = {
  favorite_opening: { answerType: 'master_ref' },
};
