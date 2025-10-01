import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { FAQClient } from './_components/FAQClient';
import { Breadcrumb, Divider } from '../_components';
import type { Locale } from '../_lib/types';

type Props = {
  params: Promise<{ locale: Locale }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'faq' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function FAQPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'faq' });

  return (
    <div className="space-y-8">
      <FAQClient />

      <Divider />

      <Breadcrumb items={[{ label: t('title') }]} locale={locale} />
    </div>
  );
}
