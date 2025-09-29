export type Question = {
  id: number;
  description: { en: string; ja: string };
  fenBefore: string;
  fenAfter: string;
  correctAnswer: string;
  options: string[];
  explanation: { en: string[]; ja: string[] };
  move: string;
};
