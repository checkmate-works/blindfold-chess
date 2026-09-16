import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { classifyLinkTarget } from '@/lib/content/link-target';

import { PagePanel } from '@/app/[locale]/_components';
import { AdSlot } from '@/app/[locale]/_components/AdSense/AdSlot';
import { resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { LocaleSearchPageProps as Props } from '@/app/[locale]/_lib/types';

import { RedirectActions } from './_components/RedirectActions';

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

  // The interstitial exists to show the user where an off-site link leads,
  // so anything that is not an off-site link has no business here: an
  // internal destination needs no warning, and an unrenderable one must not
  // be handed to the "continue" anchor.
  if (classifyLinkTarget(url) !== 'external') {
    return (
      <PagePanel>
        <div className="max-w-lg mx-auto py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">{t('title')}</h1>
          <p className="text-muted-foreground">{t('invalidUrl')}</p>
        </div>
        <AdSlot slot="content-bottom" />
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
      <AdSlot slot="content-bottom" />
    </PagePanel>
  );
}
