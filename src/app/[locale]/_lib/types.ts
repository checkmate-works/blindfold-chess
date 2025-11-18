import { SUPPORTED_LOCALES } from '@/config';

import type { GlossaryCategory } from '@/app/[locale]/glossary/_lib/types';

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export type NavigationIconName =
  | 'home'
  | 'learn'
  | 'practice'
  | 'manual'
  | 'faq'
  | 'glossary'
  | 'contact';

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
  category?: GlossaryCategory;
}
