import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ThemeProvider } from 'next-themes';
import { Inter } from 'next/font/google';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { generateThemeCSS } from '@blindfold-chess/ui';
import { eq } from 'drizzle-orm';

import { db, userRoles } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

import '../globals.css';
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

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: generateThemeCSS() }} />
      </head>
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="flex min-h-screen">
            <aside className="w-56 border-r border-border bg-secondary p-4">
              <div className="text-lg font-semibold mb-6 flex items-center gap-2">
                <Image src="/logo.png" alt="Blindfold Chess Logo" width={32} height={32} />
                {t('title')}
              </div>
              <nav className="space-y-2">
                <Link
                  href="/admin"
                  className="block px-3 py-2 rounded text-sm hover:bg-background transition-colors"
                >
                  {t('dashboard')}
                </Link>
                <Link
                  href="/admin/users"
                  className="block px-3 py-2 rounded text-sm hover:bg-background transition-colors"
                >
                  {t('users')}
                </Link>
                <Link
                  href="/admin/topic_posts"
                  className="block px-3 py-2 rounded text-sm hover:bg-background transition-colors"
                >
                  {t('topicPosts.navLabel')}
                </Link>
                <Link
                  href="/admin/audit-log"
                  className="block px-3 py-2 rounded text-sm hover:bg-background transition-colors"
                >
                  {t('auditLog')}
                </Link>
              </nav>
            </aside>
            <div className="flex-1 flex flex-col">
              <header className="flex justify-end p-4 border-b border-border">
                <ThemeToggle />
              </header>
              <main className="flex-1 p-8">{children}</main>
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
