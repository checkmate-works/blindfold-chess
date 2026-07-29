import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { headers } from 'next/headers';

import { negotiateLocale } from '@/i18n/negotiate-locale';
import { generateThemeCSS } from '@blindfold-chess/ui';

import { ThemeScript } from '@/lib/theme';
import { THEME_DARK_CLASS, THEME_LIGHT_CLASS } from '@/lib/theme/constants';

import '../globals.css';
import { parseEmbedParamsFromSearch } from './_lib/embed-params';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

/**
 * Root layout of the embed surface — a second, deliberately bare root
 * alongside `(landing)` and `[locale]`.
 *
 * What is missing from it is the point. There is no header, footer, nav,
 * announcement banner, cookie/CMP UI, analytics, or ad script, because this
 * document renders inside somebody else's article: every one of those would
 * be an uninvited guest on their page, and the ad scripts additionally must
 * not run in a third-party frame at all (AdSense forbids serving ads in an
 * iframe on a site that is not the publisher's). The widget is what the
 * reader asked for, plus one attribution link back here.
 *
 * `noindex` applies to the whole segment: the embed is the same game as
 * `/[locale]/games/shared/[id]`, which is the URL that should rank. It is not
 * `nofollow` — the attribution link is how a crawler that does reach an embed
 * finds the canonical page.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default async function EmbedLayout({ children }: { children: React.ReactNode }) {
  const requestHeaders = await headers();
  // Layouts get no `searchParams`; the proxy forwards the query string so the
  // language and colour scheme can be resolved before first paint. Both fall
  // back to a request-derived default when the header is absent.
  const { lang, bg } = parseEmbedParamsFromSearch(requestHeaders.get('x-search') ?? '');
  const locale = lang ?? negotiateLocale(requestHeaders.get('accept-language'));
  const nonce = requestHeaders.get('x-nonce') ?? undefined;

  const forcedThemeClass =
    bg === 'dark' ? THEME_DARK_CLASS : bg === 'light' ? THEME_LIGHT_CLASS : '';

  return (
    <html
      lang={locale}
      className={forcedThemeClass}
      style={bg ? { colorScheme: bg } : undefined}
      suppressHydrationWarning
    >
      <head>
        {/* Only when the host page did not pick a side: the bootstrap script
            reads localStorage and the OS setting, and would overwrite an
            explicit `?bg=` on the very first frame. */}
        {!bg && <ThemeScript />}
        <style
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: generateThemeCSS() }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground`}>
        {children}
      </body>
    </html>
  );
}
