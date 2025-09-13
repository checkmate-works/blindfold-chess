import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blindfold Chess - Master Chess Visualization | Free Online Training',
  description:
    'Master blindfold chess with our free online training platform. Practice chess visualization, improve memory, and strengthen calculation skills without seeing pieces. Interactive exercises, lessons, and games for all skill levels.',
  metadataBase: new URL('https://www.blindfold-chess.online'),
  alternates: {
    canonical: '/',
    languages: {
      en: '/en',
      ja: '/ja',
      'x-default': '/en',
    },
  },
  keywords: [
    'blindfold chess',
    'chess visualization',
    'chess training',
    'mental chess',
    'chess memory',
    'online chess training',
    'chess practice',
    'improve chess skills',
    'chess exercises',
    'free chess training',
  ],
  authors: [{ name: 'Blindfold Chess Team' }],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/favicon.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: '/logo.png',
    other: {
      rel: 'apple-touch-icon-precomposed',
      url: '/logo.png',
    },
  },
  openGraph: {
    title: 'Blindfold Chess - Master Chess Visualization',
    description:
      'Free online platform to practice chess without seeing pieces. Improve your visualization and calculation skills.',
    url: 'https://www.blindfold-chess.online',
    siteName: 'Blindfold Chess',
    type: 'website',
    locale: 'en_US',
    alternateLocale: ['ja_JP'],
    images: [
      {
        url: '/logo.png',
        width: 512,
        height: 512,
        alt: 'Blindfold Chess Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blindfold Chess - Master Chess Visualization',
    description: 'Free online platform to practice chess without seeing pieces.',
    images: ['/logo.png'],
  },
  verification: {
    google: 'rYaPyrqD32OQVX1tcfi6DfIF1_-CNh6xByjqd7hd0Vc',
  },
};

export default function RootPage() {
  return (
    <div className="fixed inset-0 min-h-screen w-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="text-center px-6 py-6 md:px-4 w-full max-w-lg box-border">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Image
            src="/logo.png"
            alt="Blindfold Chess Logo"
            width={96}
            height={96}
            className="w-24 h-24"
          />
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 text-slate-900 dark:text-slate-50 leading-tight">
          Blindfold Chess
        </h1>

        <p className="text-base sm:text-lg lg:text-xl max-w-2xl mx-auto mb-6 text-slate-500 dark:text-slate-400 leading-relaxed text-center">
          Master the art of chess visualization with our free online training platform. Practice
          chess without seeing the pieces, improve your memory, and strengthen calculation skills
          through interactive exercises and structured lessons.
        </p>

        {/* Language Selection */}
        <div>
          <h2 className="text-base font-semibold mb-4 text-slate-600 dark:text-slate-400">
            Choose your language
          </h2>

          <div className="flex flex-col sm:flex-row sm:justify-center gap-3 sm:gap-4 items-stretch w-full">
            <Link
              href="/en"
              className="flex items-center justify-start px-6 py-3 rounded-xl transition-all duration-300 no-underline w-full sm:w-auto sm:min-w-[10rem] bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 min-h-[3.5rem] box-border hover:scale-[1.02] hover:border-gray-300 dark:hover:border-slate-500"
            >
              <div className="relative flex items-center gap-3">
                <span className="text-xl">🇬🇧</span>
                <div className="text-left">
                  <p className="text-base font-semibold m-0 text-slate-900 dark:text-slate-50 leading-none">
                    English
                  </p>
                  <p className="text-xs m-0 text-slate-500 dark:text-slate-400 leading-tight mt-1">
                    Continue in English
                  </p>
                </div>
              </div>
            </Link>

            <Link
              href="/ja"
              className="flex items-center justify-start px-6 py-3 rounded-xl transition-all duration-300 no-underline w-full sm:w-auto sm:min-w-[10rem] bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 min-h-[3.5rem] box-border hover:scale-[1.02] hover:border-gray-300 dark:hover:border-slate-500"
            >
              <div className="relative flex items-center gap-3">
                <span className="text-xl">🇯🇵</span>
                <div className="text-left">
                  <p className="text-base font-semibold m-0 text-slate-900 dark:text-slate-50 leading-none">
                    日本語
                  </p>
                  <p className="text-xs m-0 text-slate-500 dark:text-slate-400 leading-tight mt-1">
                    日本語で続ける
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
