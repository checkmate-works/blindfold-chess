import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { FAQClient } from './_components/FAQClient';
import { Breadcrumb } from '../_components/Breadcrumb';

interface FAQPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: FAQPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'faq' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function FAQPage({ params }: FAQPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'faq' });

  return (
    <>
      <FAQClient />
      <div className="mt-8 pt-6 border-t border-border">
        <Breadcrumb items={[{ label: t('title') }]} />
      </div>
    </>
  );
}
