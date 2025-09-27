export type Locale = 'en' | 'ja';

export type NavigationIconName = 'home' | 'learn' | 'practice' | 'manual' | 'faq' | 'glossary';

export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  iconName: NavigationIconName;
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
