import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import Link from 'next/link';
import { MobileMenu } from './MobileMenu';
import { FaCog } from 'react-icons/fa';
import type { NavigationItem } from '../_lib/types';
import { getIcon } from '../_lib/utils';

interface Props {
  locale: string;
}

export async function Header({ locale }: Props) {
  const t = await getTranslations({ locale, namespace: 'Header' });

  const menuItems: NavigationItem[] = [
    { id: 'home', href: `/${locale}`, label: t('home'), iconName: 'home' },
    { id: 'learn', href: `/${locale}/learn`, label: t('learn'), iconName: 'learn' },
    {
      id: 'practice',
      href: `/${locale}/practice`,
      label: t('practice'),
      iconName: 'practice',
    },
    {
      id: 'manual',
      href: `/${locale}/manual`,
      label: t('manual'),
      iconName: 'manual',
    },
    { id: 'faq', href: `/${locale}/faq`, label: t('faq'), iconName: 'faq' },
    {
      id: 'glossary',
      href: `/${locale}/glossary`,
      label: t('glossary'),
      iconName: 'glossary',
    },
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
                alt="Blindfold Chess Logo"
                width={40}
                height={40}
                className="w-10 h-10"
              />
              {/* Title - hidden on mobile/tablet, visible on desktop */}
              <span className="hidden lg:block text-xl font-bold text-foreground">
                {t('title')}
              </span>
            </Link>

            {/* Desktop navigation */}
            <nav className="hidden lg:flex items-center space-x-6">
              {menuItems.slice(1).map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent px-3 py-2 rounded-md transition-colors"
                >
                  {getIcon(item.iconName)}
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right side: Settings icon */}
          <Link
            href={`/${locale}/preferences`}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
            aria-label={t('settings')}
          >
            <FaCog className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
