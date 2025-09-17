import '../globals.css';
import { Header } from './_components/Header';
import { Inter } from 'next/font/google';

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

  return (
    <html lang={locale}>
      <body className={`${inter.variable} font-sans antialiased`}>
        <div className="flex flex-col min-h-screen">
          <Header locale={locale} />
          <main className="flex-1 bg-neutral-50 dark:bg-slate-900">{children}</main>
        </div>
      </body>
    </html>
  );
}
