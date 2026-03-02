import { SUPPORTED_LOCALES } from '@/config';

import type { GlossaryCategory } from '@/app/[locale]/(public)/glossary/_lib/types';

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export type NavigationIconName =
  | 'home'
  | 'posts'
  | 'getting-started'
  | 'learn'
  | 'practice'
  | 'manual'
  | 'faq'
  | 'glossary'
  | 'contact'
  | 'settings';

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
  positions?: { fen: string; sortOrder: number; caption?: string }[];
  category?: GlossaryCategory;
}
