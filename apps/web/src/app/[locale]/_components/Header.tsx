import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import Link from 'next/link';

import { getLatestBannerAnnouncement } from '@/app/[locale]/(public)/announcements/_lib/queries';

import type { NavigationItem } from '../_lib/types';
import { AnnouncementBanner } from './AnnouncementBanner';
import { HeaderNavigation } from './HeaderNavigation';
import { HeaderRightSection } from './HeaderRightSection';
import { ANNOUNCEMENT_DISMISS_SCRIPT } from './announcement-dismiss-script';

type Props = {
  locale: string;
};

export async function Header({ locale }: Props) {
  const [t, bannerAnnouncement] = await Promise.all([
    getTranslations({ locale, namespace: 'Header' }),
    getLatestBannerAnnouncement(locale),
  ]);

  const commonItems: NavigationItem[] = [
    { id: 'home', href: `/${locale}`, label: t('home'), iconName: 'home' },
    { id: 'dojo', href: `/${locale}/dojo`, label: t('dojo'), iconName: 'dojo' },
    { id: 'learn', href: `/${locale}/learn`, label: t('learn'), iconName: 'learn' },
    { id: 'practice', href: `/${locale}/practice`, label: t('practice'), iconName: 'practice' },
    {
      // Link straight to the canonical destination instead of `/leaderboard`
      // (a redirect-only route with no `loading.tsx`). The extra redirect hop
      // left the main content blank until the second navigation resolved its
      // skeleton; landing directly on a route that owns `loading.tsx` shows
      // the skeleton instantly and avoids the white-flash CLS.
      id: 'leaderboard',
      href: `/${locale}/leaderboard/score/all-time`,
      label: t('leaderboard'),
      iconName: 'leaderboard',
    },
    { id: 'topics', href: `/${locale}/topics`, label: t('topics'), iconName: 'topics' },
    { id: 'articles', href: `/${locale}/articles`, label: t('articles'), iconName: 'articles' },
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
      {bannerAnnouncement && (
        <>
          {/*
            No-flash dismiss script. Runs synchronously before the banner
            paints: reads the `dismissed-announcement` cookie and, when it
            matches this banner's id (carried on `data-announcement-id`,
            read back via `document.currentScript`), injects a `<style>` tag
            hiding the banner. The script text is a build-time constant so
            the CSP allows it by hash — a `cookies()` read here (or a nonce
            read via `headers()`) would mark the entire [locale]/ subtree
            dynamic and regress SSG/ISR pages. See
            `./announcement-dismiss-script.ts`.
          */}
          <script
            data-announcement-id={bannerAnnouncement.id}
            suppressHydrationWarning
            dangerouslySetInnerHTML={{ __html: ANNOUNCEMENT_DISMISS_SCRIPT }}
          />
          <AnnouncementBanner
            id={bannerAnnouncement.id}
            title={bannerAnnouncement.title}
            href={`/${locale}/announcements/${bannerAnnouncement.slug}`}
          />
        </>
      )}
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
