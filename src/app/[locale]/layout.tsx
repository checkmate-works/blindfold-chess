import '../globals.css';
import { Header } from './_components/Header';
import { Inter } from 'next/font/google';
import { Providers } from './_lib/providers';
import { getMessages } from 'next-intl/server';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages({ locale });

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground`}>
        <Providers locale={locale} messages={messages}>
          <div className="flex flex-col min-h-screen">
            <Header locale={locale} />
            <main className="flex-1 bg-secondary">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
