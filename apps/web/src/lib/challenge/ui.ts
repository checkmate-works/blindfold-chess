import { MISTAKE_LIMIT } from './constants';

export function getMissColorClass(incorrectAnswers: number): string {
  if (incorrectAnswers >= MISTAKE_LIMIT) return 'text-destructive';
  if (incorrectAnswers === 0) return 'text-success';
  return 'text-foreground';
}
