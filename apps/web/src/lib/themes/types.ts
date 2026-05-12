import type { BoardAnnotations } from '@/lib/board-annotations/types';

export type ThemePosition = {
  fen: string;
  sortOrder: number;
  caption: string | null;
  /**
   * Validated annotation set for this (term, fen) row, ready to render
   * via `<BoardAnnotationOverlay>`. Always present (empty singleton when
   * the DB column is unset) so callers can render unconditionally.
   */
  annotations: BoardAnnotations;
};

export type ThemeOption = {
  id: string;
  slug: string;
  label: string;
  category: string;
  /**
   * First example FEN attached to this glossary term (lowest
   * `sort_order` row in `glossary_term_positions`). `null` for terms
   * with no example positions seeded — most theme-eligible terms are
   * abstract concepts (pin, prophylaxis, …) that don't have a single
   * canonical board.
   */
  previewFen: string | null;
  /**
   * Locale-resolved definition body. Falls back to the English
   * translation row when no row exists for the requested locale, then
   * to `null` if even that is missing.
   */
  definition: string | null;
  /** Optional pronunciation hint (furigana for Japanese). */
  reading: string | null;
  /** All example positions for the term, ordered by sort_order. */
  positions: ThemePosition[];
};
