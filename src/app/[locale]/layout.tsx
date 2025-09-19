import '../globals.css';
import { Header } from './_components/Header';
import { Footer } from './_components/Footer';
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
            <main className="flex-1 bg-secondary">
              <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</div>
            </main>
            <Footer locale={locale} />
          </div>
        </Providers>
      </body>
    </html>
  );
}
