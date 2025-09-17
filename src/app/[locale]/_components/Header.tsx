import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import Link from 'next/link';
import { MobileMenu } from './MobileMenu';
import {
  FaGraduationCap,
  FaDumbbell,
  FaBook,
  FaQuestionCircle,
  FaList,
  FaCog,
} from 'react-icons/fa';
import type { NavigationItem } from '../_lib/types';

interface HeaderProps {
  locale: string;
}

export async function Header({ locale }: HeaderProps) {
  const t = await getTranslations({ locale, namespace: 'Header' });

  const menuItems: NavigationItem[] = [
    { id: 'home', href: `/${locale}`, label: t('home'), isLink: true, iconName: 'home' },
    { id: 'learn', href: `/${locale}/learn`, label: t('learn'), isLink: true, iconName: 'learn' },
    {
      id: 'practice',
      href: `/${locale}/practice`,
      label: t('practice'),
      isLink: true,
      iconName: 'practice',
    },
    {
      id: 'manual',
      href: `/${locale}/manual`,
      label: t('manual'),
      isLink: true,
      iconName: 'manual',
    },
    { id: 'faq', href: `/${locale}/faq`, label: t('faq'), isLink: true, iconName: 'faq' },
    {
      id: 'glossary',
      href: `/${locale}/glossary`,
      label: t('glossary'),
      isLink: true,
      iconName: 'glossary',
    },
  ];

  return (
    <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700">
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
              {/* Title - hidden on mobile, visible on desktop */}
              <span className="hidden md:block text-xl font-bold text-gray-900 dark:text-gray-100">
                {t('title')}
              </span>
            </Link>

            {/* Desktop navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              {menuItems.slice(1).map((item) => {
                const getIcon = () => {
                  switch (item.iconName) {
                    case 'learn':
                      return <FaGraduationCap className="h-5 w-5" />;
                    case 'practice':
                      return <FaDumbbell className="h-5 w-5" />;
                    case 'manual':
                      return <FaBook className="h-5 w-5" />;
                    case 'faq':
                      return <FaQuestionCircle className="h-5 w-5" />;
                    case 'glossary':
                      return <FaList className="h-5 w-5" />;
                    default:
                      return null;
                  }
                };
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-2 rounded-md transition-colors"
                  >
                    {getIcon()}
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right side: Settings icon */}
          <Link
            href={`/${locale}/preferences`}
            className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            aria-label={t('settings')}
          >
            <FaCog className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
