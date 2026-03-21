import { SUPPORTED_LOCALES } from '@/config';

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export type NavigationIconName =
  | 'home'
  | 'dashboard'
  | 'articles'
  | 'getting-started'
  | 'learn'
  | 'practice'
  | 'topics'
  | 'leaderboard'
  | 'manual'
  | 'announcements'
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
