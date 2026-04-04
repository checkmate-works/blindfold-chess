import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';

import { PagePanel, PageTitle } from '@/app/[locale]/_components';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { LocaleSearchPageProps as Props } from '@/app/[locale]/_lib/types';

import { ContactConfirm } from '../_components/ContactConfirm';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'contact.confirm' });

  const title = t('title');
  const description = t('description');

  return {
    ...generateCanonicalMetadata({ locale, path: 'contact/confirm', title, description }),
    title: resolveTitle(title, locale),
    description,
    robots: 'noindex',
  };
}

export default async function ContactConfirmPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const search = await searchParams;
  const t = await getTranslations({ locale, namespace: 'contact' });

  // Check if required data exists
  if (!search.name || !search.email || !search.subject || !search.message) {
    redirect(`/${locale}/contact`);
  }

  const formData = {
    name: Array.isArray(search.name) ? search.name[0] : search.name,
    email: Array.isArray(search.email) ? search.email[0] : search.email,
    subject: Array.isArray(search.subject) ? search.subject[0] : search.subject,
    message: Array.isArray(search.message) ? search.message[0] : search.message,
  };

  return (
    <div className="space-y-8">
      <PageTitle>{t('confirm.title')}</PageTitle>

      <PagePanel>
        <ContactConfirm formData={formData} locale={locale} />
      </PagePanel>
    </div>
  );
}
