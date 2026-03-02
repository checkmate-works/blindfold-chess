import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { generateThemeCSS } from '@blindfold-chess/ui';
import { eq } from 'drizzle-orm';

import { db, userRoles } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

import '../globals.css';

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

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: generateThemeCSS() }} />
      </head>
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground`}>
        <div className="flex min-h-screen">
          <aside className="w-56 border-r border-border bg-secondary p-4">
            <h2 className="text-lg font-semibold mb-6">Admin</h2>
            <nav className="space-y-2">
              <Link
                href="/admin"
                className="block px-3 py-2 rounded text-sm hover:bg-background transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/admin/users"
                className="block px-3 py-2 rounded text-sm hover:bg-background transition-colors"
              >
                Users
              </Link>
            </nav>
          </aside>
          <main className="flex-1 p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
