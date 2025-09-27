export type Locale = 'en' | 'ja';

export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  isLink: boolean;
  iconName?: string;
}

export interface ChessTerm {
  term: string;
  termJa?: string;
  reading?: string;
  definition: string;
  definitionEn?: string;
  aliases?: string[];
  relatedTerms?: string[];
  category?: 'tactics' | 'strategy' | 'endgame' | 'opening' | 'structure' | 'general';
}
