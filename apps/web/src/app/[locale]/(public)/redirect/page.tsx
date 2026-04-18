import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { ADSENSE_SLOT_CONTENT_BOTTOM, IS_LOCAL_DEV } from '@/config';

import { isInternalUrl } from '@/lib/content/linkify-urls';

import { PagePanel } from '@/app/[locale]/_components';
import { AdSenseGuard } from '@/app/[locale]/_components/AdSense/AdSenseGuard';
import { resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { LocaleSearchPageProps as Props } from '@/app/[locale]/_lib/types';

import { RedirectActions } from './_components/RedirectActions';

function isValidExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    return !isInternalUrl(url);
  } catch {
    return false;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'redirect' });

  return {
    title: resolveTitle(t('title'), locale),
    robots: { index: false, follow: false },
  };
}

export default async function RedirectPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const url = typeof sp.url === 'string' ? sp.url : '';
  const t = await getTranslations({ locale, namespace: 'redirect' });

  if (!url || !isValidExternalUrl(url)) {
    return (
      <PagePanel>
        <div className="max-w-lg mx-auto py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">{t('title')}</h1>
          <p className="text-muted-foreground">{t('invalidUrl')}</p>
        </div>
        {(IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_BOTTOM) && (
          <AdSenseGuard slot="content-bottom" slotId={ADSENSE_SLOT_CONTENT_BOTTOM ?? ''} />
        )}
      </PagePanel>
    );
  }

  return (
    <PagePanel>
      <div className="max-w-lg mx-auto py-2">
        <h1 className="text-2xl font-bold mb-4">{t('title')}</h1>
        <p className="text-muted-foreground mb-6">{t('warning')}</p>
        <div className="mb-6">
          <p className="text-sm text-muted-foreground mb-2">{t('destination')}</p>
          <p className="text-sm text-foreground break-all bg-muted p-3 rounded-md font-mono">
            {url}
          </p>
        </div>
        <RedirectActions url={url} locale={locale} />
      </div>
      {(IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_BOTTOM) && (
        <AdSenseGuard slot="content-bottom" slotId={ADSENSE_SLOT_CONTENT_BOTTOM ?? ''} />
      )}
    </PagePanel>
  );
}
