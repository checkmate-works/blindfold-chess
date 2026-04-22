import { getTranslations } from 'next-intl/server';
import { headers } from 'next/headers';
import Image from 'next/image';
import Link from 'next/link';

import { getLatestBannerAnnouncement } from '@/app/[locale]/(public)/announcements/_lib/queries';

import type { NavigationItem } from '../_lib/types';
import { AnnouncementBanner } from './AnnouncementBanner';
import { HeaderNavigation } from './HeaderNavigation';
import { HeaderRightSection } from './HeaderRightSection';

type Props = {
  locale: string;
};

/**
 * Inline script that runs synchronously before the banner paints. It reads the
 * `dismissed-announcement` cookie on the client and, if it matches the
 * currently-rendered banner id, injects a `<style>` tag that hides the banner
 * before it becomes visible. This mirrors the classic "dark mode no-flash"
 * pattern and is required because the Header is in the [locale]/ layout tree:
 * calling `cookies()` here would mark the entire subtree dynamic and regress
 * previously-SSG pages (privacy, terms, preferences, practice tutorials).
 */
function buildDismissScript(bannerId: string): string {
  // Keep this tiny and self-contained; no external references.
  const safeId = JSON.stringify(bannerId);
  return `(function(){try{var m=document.cookie.match(/(?:^|;\\s*)dismissed-announcement=([^;]*)/);if(m&&decodeURIComponent(m[1])===${safeId}){var s=document.createElement('style');s.setAttribute('data-announcement-dismiss','1');s.textContent='[data-announcement-banner-id="'+${safeId}+'"]{display:none!important;}';document.head.appendChild(s);}}catch(e){}})();`;
}

export async function Header({ locale }: Props) {
  const [t, bannerAnnouncement, requestHeaders] = await Promise.all([
    getTranslations({ locale, namespace: 'Header' }),
    getLatestBannerAnnouncement(locale),
    headers(),
  ]);
  const nonce = requestHeaders.get('x-nonce') ?? undefined;

  const commonItems: NavigationItem[] = [
    { id: 'home', href: `/${locale}`, label: t('home'), iconName: 'home' },
    { id: 'dojo', href: `/${locale}/dojo`, label: t('dojo'), iconName: 'dojo' },
    { id: 'learn', href: `/${locale}/learn`, label: t('learn'), iconName: 'learn' },
    { id: 'practice', href: `/${locale}/practice`, label: t('practice'), iconName: 'practice' },
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
          <script
            nonce={nonce}
            suppressHydrationWarning
            dangerouslySetInnerHTML={{ __html: buildDismissScript(bannerAnnouncement.id) }}
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
