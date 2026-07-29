import { getTranslations } from 'next-intl/server';
import { headers } from 'next/headers';

import { SITE_URL } from '@/config';
import { negotiateLocale } from '@/i18n/negotiate-locale';

/**
 * What a reader sees when the embedded game is gone — deleted, unpublished,
 * or never existed (a mistyped code).
 *
 * The embed segment needs its own boundary rather than falling through to the
 * site-wide 404: that page is a full-chrome landing with header, nav and
 * illustration, which inside a 400px frame in someone's article is both broken
 * and alarming. A published article can outlive the game it embeds, so this is
 * a state the widget is expected to reach eventually, not an error — it says
 * so plainly and still offers the way back to the site.
 */
export default async function EmbedNotFound() {
  const locale = negotiateLocale((await headers()).get('accept-language'));
  const t = await getTranslations({ locale, namespace: 'embed' });
  const tMetadata = await getTranslations({ locale, namespace: 'metadata' });

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background p-6 text-center">
      <p className="text-sm text-muted-foreground">{t('unavailable')}</p>
      <a
        href={`${SITE_URL}/${locale}?utm_source=embed&utm_medium=iframe`}
        target="_blank"
        rel="noopener"
        className="text-sm font-medium text-foreground underline"
      >
        {tMetadata('siteName')}
      </a>
    </div>
  );
}
