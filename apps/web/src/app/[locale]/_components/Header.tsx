import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import Link from 'next/link';

import type { NavigationItem } from '../_lib/types';
import { AnnouncementBannerContainer } from './AnnouncementBannerContainer';
import { HeaderNavigation } from './HeaderNavigation';
import { HeaderRightSection } from './HeaderRightSection';

type Props = {
  locale: string;
};

export async function Header({ locale }: Props) {
  const t = await getTranslations({ locale, namespace: 'Header' });

  const commonItems: NavigationItem[] = [
    { id: 'home', href: `/${locale}`, label: t('home'), iconName: 'home' },
    { id: 'ranks', href: `/${locale}/ranks`, label: t('ranks'), iconName: 'ranks' },
    { id: 'guides', href: `/${locale}/guides`, label: t('guides'), iconName: 'guides' },
    { id: 'learn', href: `/${locale}/learn`, label: t('learn'), iconName: 'learn' },
    { id: 'practice', href: `/${locale}/practice`, label: t('practice'), iconName: 'practice' },
    { id: 'topics', href: `/${locale}/topics`, label: t('topics'), iconName: 'topics' },
    { id: 'articles', href: `/${locale}/articles`, label: t('articles'), iconName: 'articles' },
    {
      id: 'leaderboard',
      href: `/${locale}/leaderboard`,
      label: t('leaderboard'),
      iconName: 'leaderboard',
    },
    { id: 'settings', href: `/${locale}/preferences`, label: t('settings'), iconName: 'settings' },
  ];

  const authenticatedItems: NavigationItem[] = [
    { id: 'dashboard', href: '/', label: t('dashboard'), iconName: 'dashboard' },
    ...commonItems,
  ];

  const unauthenticatedItems: NavigationItem[] = [
    commonItems[0],
    {
      id: 'getting-started',
      href: `/${locale}/getting-started`,
      label: t('gettingStarted'),
      iconName: 'getting-started',
    },
    ...commonItems.slice(1),
  ];

  return (
    <>
      <AnnouncementBannerContainer />
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            {/* Left side: Mobile menu + Logo + Title + Desktop navigation */}
            <div className="flex items-center space-x-6">
              {/* Mobile menu button - only this part needs client-side */}
              <HeaderNavigation
                title={t('title')}
                authenticatedItems={authenticatedItems}
                unauthenticatedItems={unauthenticatedItems}
              />

              {/* Logo + Title */}
              <Link href={`/${locale}`} className="flex items-center gap-3">
                {/* Logo - always visible */}
                <Image
                  src="/logo.png"
                  alt={`${t('title')} Logo`}
                  width={40}
                  height={40}
                  className="w-10 h-10"
                  priority
                />
                {/* Title - hidden on mobile/tablet, visible on desktop */}
                <span className="hidden lg:block text-xl font-bold text-foreground">
                  {t('title')}
                </span>
              </Link>

              {/* Desktop navigation - REMOVED per user request to unify with mobile menu */}
            </div>

            {/* Right side: Notifications + Auth status */}
            <HeaderRightSection />
          </div>
        </div>
      </header>
    </>
  );
}
