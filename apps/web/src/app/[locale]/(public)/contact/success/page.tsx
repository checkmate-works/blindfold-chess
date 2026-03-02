import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

import { Button } from '@/app/_components';

import { PageDescription, PagePanel, PageTitle } from '@/app/[locale]/_components';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

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

      <PagePanel className="space-y-8 flex justify-center">
        <div className="w-full max-w-2xl mt-4 sm:mt-8">
          <Link href={`/${locale}`} className="block">
            <Button
              asChild
              variant="secondary"
              size="lg"
              fullWidth
              shadow={false}
              className="border-0 hover:bg-secondary/80"
            >
              {t('success.backToHome')}
            </Button>
          </Link>
        </div>
      </PagePanel>
    </div>
  );
}
