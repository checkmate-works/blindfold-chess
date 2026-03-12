import { SUPPORTED_LOCALES } from '@/config';

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
