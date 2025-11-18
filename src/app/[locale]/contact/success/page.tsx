import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

import { PageDescription } from '../../_components/PageDescription';
import { PageTitle } from '../../_components/PageTitle';
import { PrimaryButton } from '../../_components/PrimaryButton';
import { generateCanonicalMetadata } from '../../_lib/metadata';
import type { Locale } from '../../_lib/types';

type Props = {
  params: Promise<{ locale: Locale }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'contact.success' });

  return {
    ...generateCanonicalMetadata({ locale, path: 'contact/success' }),
    title: t('title'),
    description: t('message'),
    robots: 'noindex',
  };
}

export default async function ContactSuccessPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'contact' });

  return (
    <div className="space-y-8">
      <PageTitle>{t('success.title')}</PageTitle>

      <PageDescription>{t('success.message')}</PageDescription>

      <div className="max-w-2xl mt-8">
        <Link href={`/${locale}`} className="block">
          <PrimaryButton type="button" variant="secondary">
            {t('success.backToHome')}
          </PrimaryButton>
        </Link>
      </div>
    </div>
  );
}
