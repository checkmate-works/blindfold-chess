import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import Link from 'next/link';

import { createClient } from '@/lib/supabase/server';

import type { NavigationItem } from '../_lib/types';
import { HeaderRightSection } from './HeaderRightSection';
import { MobileMenu } from './MobileMenu';

type Props = {
  locale: string;
};

export async function Header({ locale }: Props) {
  const [t, supabase] = await Promise.all([
    getTranslations({ locale, namespace: 'Header' }),
    createClient(),
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthenticated = !!user;

  const menuItems: NavigationItem[] = [
    { id: 'home', href: `/${locale}`, label: t('home'), iconName: 'home' },
    {
      id: 'getting-started',
      href: `/${locale}/getting-started`,
      label: t('gettingStarted'),
      iconName: 'getting-started',
    },
    { id: 'learn', href: `/${locale}/learn`, label: t('learn'), iconName: 'learn' },
    {
      id: 'practice',
      href: `/${locale}/practice`,
      label: t('practice'),
      iconName: 'practice',
    },
    {
      id: 'topics',
      href: `/${locale}/topics`,
      label: t('topics'),
      iconName: 'topics',
    },
    {
      id: 'articles',
      href: `/${locale}/articles`,
      label: t('articles'),
      iconName: 'articles',
    },
    {
      id: 'glossary',
      href: `/${locale}/glossary`,
      label: t('glossary'),
      iconName: 'glossary',
    },
    {
      id: 'manual',
      href: `/${locale}/manual`,
      label: t('manual'),
      iconName: 'manual',
    },
    {
      id: 'announcements',
      href: `/${locale}/announcements`,
      label: t('announcements'),
      iconName: 'announcements',
    },
    { id: 'faq', href: `/${locale}/faq`, label: t('faq'), iconName: 'faq' },
    { id: 'settings', href: `/${locale}/preferences`, label: t('settings'), iconName: 'settings' },
  ];

  return (
    <header className="bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Left side: Mobile menu + Logo + Title + Desktop navigation */}
          <div className="flex items-center space-x-6">
            {/* Mobile menu button - only this part needs client-side */}
            <MobileMenu title={t('title')} items={menuItems} />

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
          <HeaderRightSection isAuthenticated={isAuthenticated} />
        </div>
      </div>
    </header>
  );
}
