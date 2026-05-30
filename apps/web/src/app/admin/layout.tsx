import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { NavigationGuardProvider } from 'next-navigation-guard';
import { Inter } from 'next/font/google';
import { headers } from 'next/headers';
import Image from 'next/image';
import { notFound } from 'next/navigation';

import { EnvironmentRibbon } from '@/app/_components/EnvironmentRibbon';
import { generateThemeCSS } from '@blindfold-chess/ui';
import { eq } from 'drizzle-orm';
import { NuqsAdapter } from 'nuqs/adapters/next/app';

import { db, userRoles } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { ThemeProvider, ThemeScript } from '@/lib/theme';

import { ToastProvider } from '@/app/[locale]/_contexts/ToastContext';

import '../globals.css';
import { type AdminNavGroup, AdminSidebarNav } from './_components/AdminSidebarNav';
import { AdminToastContainer } from './_components/AdminToastContainer';
import { ThemeToggle } from './_components/ThemeToggle';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Admin Panel',
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const [userRole] = await db
    .select()
    .from(userRoles)
    .where(eq(userRoles.userId, user.id))
    .limit(1);

  if (!userRole || userRole.role !== 'admin') {
    notFound();
  }

  const t = await getTranslations({ locale: 'en', namespace: 'Admin' });
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  // Sidebar nav: grouped for scannability. Item labels come from i18n (resolved
  // here on the server); group headings are plain English by the admin
  // English-only convention. Active-state highlighting is handled client-side
  // in AdminSidebarNav via usePathname.
  const navGroups: AdminNavGroup[] = [
    { links: [{ href: '/admin', label: t('dashboard') }] },
    {
      heading: 'Content',
      links: [
        { href: '/admin/articles', label: t('articles') },
        { href: '/admin/announcements', label: t('announcements') },
        { href: '/admin/chunks', label: t('chunks') },
        { href: '/admin/glossary', label: t('glossary') },
      ],
    },
    {
      heading: 'Users & Moderation',
      links: [
        { href: '/admin/users', label: t('users') },
        { href: '/admin/topic_posts', label: t('topicPosts.navLabel') },
        { href: '/admin/audit-log', label: t('auditLog') },
        { href: '/admin/activity-log', label: t('activityLog') },
      ],
    },
    {
      heading: 'Economy',
      links: [
        { href: '/admin/coins', label: t('coins.navLabel') },
        { href: '/admin/grants', label: t('grants.navLabel') },
        { href: '/admin/subscriptions', label: t('subscriptions') },
        { href: '/admin/ads', label: t('ads') },
      ],
    },
    {
      heading: 'Game Data',
      links: [
        { href: '/admin/positions/memory', label: t('positionMemory') },
        { href: '/admin/positions/puzzle', label: t('puzzle') },
        { href: '/admin/achievements', label: t('achievements.navLabel') },
      ],
    },
  ];

  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <ThemeScript />
        <style
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: generateThemeCSS() }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground`}>
        <EnvironmentRibbon />
        <ThemeProvider disableTransitionOnChange>
          <div className="flex min-h-screen">
            <aside className="w-56 border-r border-border bg-secondary p-4">
              <div className="text-lg font-semibold mb-6 flex items-center gap-2">
                <Image src="/logo.png" alt="Blindfold Chess Logo" width={32} height={32} />
                {t('title')}
              </div>
              <AdminSidebarNav groups={navGroups} />
            </aside>
            <div className="flex-1 flex flex-col">
              <header className="flex justify-end p-4 border-b border-border">
                <ThemeToggle />
              </header>
              <main className="flex-1 p-8">
                <ToastProvider>
                  <NavigationGuardProvider>
                    <NuqsAdapter>{children}</NuqsAdapter>
                  </NavigationGuardProvider>
                  <AdminToastContainer />
                </ToastProvider>
              </main>
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
