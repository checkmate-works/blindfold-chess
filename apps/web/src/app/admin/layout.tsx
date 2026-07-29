import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { NavigationGuardProvider } from 'next-navigation-guard';
import { Inter } from 'next/font/google';
import { headers } from 'next/headers';
import Image from 'next/image';
import { notFound } from 'next/navigation';

import { generateThemeCSS } from '@blindfold-chess/ui';
import { eq } from 'drizzle-orm';
import { EnvironmentRibbon } from 'env-ribbon';
import { NuqsAdapter } from 'nuqs/adapters/next/app';

import { db, userRoles } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { ThemeProvider, ThemeScript } from '@/lib/theme';

import { ToastProvider } from '@/app/[locale]/_contexts/ToastContext';

import '../globals.css';
import { AdminShell } from './_components/AdminShell';
import { type AdminNavGroup, AdminSidebarNav } from './_components/AdminSidebarNav';
import { AdminToastContainer } from './_components/AdminToastContainer';

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
      heading: 'Users & Moderation',
      links: [
        { href: '/admin/users', label: t('users') },
        { href: '/admin/audit-log', label: t('auditLog') },
        { href: '/admin/activity-log', label: t('activityLog') },
      ],
    },
    {
      // Developer-curated reference data (defined/edited by the team).
      heading: 'Master Data',
      links: [
        { href: '/admin/articles', label: t('articles') },
        { href: '/admin/announcements', label: t('announcements') },
        { href: '/admin/glossary', label: t('glossary.navLabel') },
      ],
    },
    {
      // User-generated content.
      heading: 'UGC',
      links: [
        { href: '/admin/topic_posts', label: t('topicPosts.navLabel') },
        { href: '/admin/positions/memory', label: t('positionMemory') },
        { href: '/admin/positions/puzzle', label: t('puzzle') },
        { href: '/admin/chunks', label: t('chunks') },
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
    // Achievements has no natural group yet — keep it standalone at the bottom.
    { links: [{ href: '/admin/achievements', label: t('achievements.navLabel') }] },
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
          <AdminShell
            sidebar={
              <>
                <div className="text-lg font-semibold mb-6 flex items-center gap-2">
                  <Image src="/logo.png" alt="Blindfold Chess Logo" width={32} height={32} />
                  {t('title')}
                </div>
                <AdminSidebarNav groups={navGroups} />
              </>
            }
          >
            <ToastProvider>
              <NavigationGuardProvider>
                <NuqsAdapter>{children}</NuqsAdapter>
              </NavigationGuardProvider>
              <AdminToastContainer />
            </ToastProvider>
          </AdminShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
