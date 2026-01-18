import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/routing';

import { Breadcrumb, Divider, PageTitle } from '../_components';
import { generateCanonicalMetadata } from '../_lib/metadata';
import type { Locale } from '../_lib/types';
import { FAQClient } from './_components/FAQClient';
import type { FAQItem } from './_lib/types';

type Props = {
  params: Promise<{ locale: Locale }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'faq' });

  return {
    ...generateCanonicalMetadata({ locale, path: 'faq' }),
    title: t('title'),
    description: t('description'),
  };
}

export default async function FAQPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'faq' });

  const faqItems: FAQItem[] = [
    {
      id: 'invalid-move',
      question: t('items.invalidMove.question'),
      answer: t.rich('items.invalidMove.answer', {
        settingsLink: (chunks) => (
          <Link
            href="/preferences?tab=game"
            className="text-foreground underline hover:opacity-80 transition-colors"
          >
            {chunks}
          </Link>
        ),
      }),
    },
    {
      id: 'ads',
      question: t('items.ads.question'),
      answer: t.rich('items.ads.answer', {
        settingsLink: (chunks) => (
          <Link
            href="/preferences?tab=ads"
            className="text-foreground underline hover:opacity-80 transition-colors"
          >
            {chunks}
          </Link>
        ),
      }),
    },
    {
      id: 'chess-engine',
      question: t('items.chessEngine.question'),
      answer: t('items.chessEngine.answer'),
    },
  ];

  return (
    <div className="space-y-8">
      <PageTitle>{t('title')}</PageTitle>

      <FAQClient items={faqItems} />

      <Divider />

      <Breadcrumb items={[{ label: t('title') }]} locale={locale} />
    </div>
  );
}
