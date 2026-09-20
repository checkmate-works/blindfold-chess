import type { Locale } from '@blindfold-chess/types';

export type { Locale };

export type LocalePageProps = {
  params: Promise<{ locale: Locale }>;
};

export type LocaleSearchPageProps = LocalePageProps & {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export type NavigationIconName =
  | 'home'
  | 'dashboard'
  | 'articles'
  | 'games'
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
  | 'settings'
  | 'ranks'
  | 'guides'
  | 'dojo'
  | 'coin';

export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  iconName: NavigationIconName;
}
