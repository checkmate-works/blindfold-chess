export type CategoryStyle = {
  color: string;
  icon: string;
};

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
  positions?: { fen: string; sortOrder: number; caption?: string }[];
  category?: GlossaryCategory;
}
