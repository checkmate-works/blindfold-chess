import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { PagePanel, PageTitle } from '@/app/[locale]/_components';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { ContactForm } from './_components/ContactForm';

type Props = {
  params: Promise<{ locale: Locale }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.contact' });

  return {
    ...generateCanonicalMetadata({ locale, path: 'contact' }),
    title: t('title'),
    description: t('description'),
  };
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'contact' });

  return (
    <div className="space-y-8">
      <PageTitle>{t('title')}</PageTitle>

      <PagePanel>
        <ContactForm locale={locale} />
      </PagePanel>
    </div>
  );
}
