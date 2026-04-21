import type { Locale } from '@/app/[locale]/_lib/types';

// Per-locale text for a single quiz question. Typed as `Partial<Record<Locale, _>>`
// so locales can be added to `SUPPORTED_LOCALES` before the question data
// has per-locale strings. Consumers must fall back to `en` when the current
// locale is missing (see `AlgebraicNotationPlaying` / `AlgebraicNotationResult`).
export type Question = {
  id: number;
  description: Partial<Record<Locale, string>>;
  fenBefore: string;
  fenAfter: string;
  correctAnswer: string;
  options: string[];
  explanation: Partial<Record<Locale, string[]>>;
  move: string;
};
