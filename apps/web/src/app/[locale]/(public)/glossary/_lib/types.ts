import type { BoardAnnotations } from '@/lib/board-annotations/types';

export const CATEGORY_STYLES = {
  tactics: { color: 'bg-destructive/10 text-destructive', icon: '⚔️' },
  strategy: { color: 'bg-primary/10 text-primary', icon: '🎯' },
  endgame: { color: 'bg-secondary/10 text-secondary-foreground', icon: '♔' },
  opening: { color: 'bg-muted/50 text-muted-foreground', icon: '📖' },
  structure: { color: 'bg-accent/50 text-accent-foreground', icon: '♟' },
  general: { color: 'bg-card text-card-foreground', icon: '📋' },
} as const;

export type GlossaryCategory = keyof typeof CATEGORY_STYLES;

export const CATEGORY_COLORS: Record<GlossaryCategory, string> = {
  tactics: 'bg-destructive/10 text-destructive',
  strategy: 'bg-primary/10 text-primary',
  endgame: 'bg-secondary/10 text-secondary-foreground',
  opening: 'bg-muted/50 text-muted-foreground',
  structure: 'bg-accent/50 text-accent-foreground',
  general: 'bg-card text-card-foreground',
} as const;

export interface ChessTerm {
  term: string;
  termJa?: string;
  reading?: string;
  definition: string;
  definitionEn?: string;
  aliases?: string[];
  relatedTerms?: string[];
  positions?: {
    fen: string;
    sortOrder: number;
    caption?: string;
    /**
     * Display-only annotations for this (term, fen) row.
     *
     * **In code (seed input)**: a one-time bootstrap value used only on
     * the initial INSERT. The seed deliberately omits this field from
     * the conflict UPDATE set so that subsequent runs do not overwrite
     * admin edits made via `/admin/glossary/[slug]`. If you need to
     * permanently change annotations on a seeded position, do it in the
     * admin UI rather than this file.
     *
     * **From the DB query path**: always populated — `mergeTermRows`
     * normalizes through `parseBoardAnnotations` and falls back to the
     * shared empty singleton when the JSONB column is unset.
     */
    annotations?: BoardAnnotations;
  }[];
  category?: GlossaryCategory;
  /**
   * Whether this term is selectable as a theme tag on positions (via
   * `position_themes`). Default `false`. Set to `true` only for terms
   * that meaningfully tag specific positions for learning/filtering
   * (tactical motifs, structural features, positional themes, endgame
   * patterns). Concept vocabulary (Calculation, Flank, Tactics, ...),
   * meta-game terms, and concrete piece-config templates that belong
   * in the chunks UGC system stay `false`.
   */
  isTheme?: boolean;
}
