import { getTranslations } from 'next-intl/server';
import { PageTitle, Breadcrumb, Divider } from '@/app/[locale]/_components';
import { PositionMemory } from './_components/PositionMemory';
import type { Locale } from '../../_lib/types';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return {
    title: t('practice.positionMemory.title'),
    description: t('practice.positionMemory.description'),
  };
}

export default async function PositionMemoryPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return (
    <div className="space-y-8">
      <PageTitle>{t('practice.positionMemory.title')}</PageTitle>

      <p className="text-muted-foreground">{t('practice.positionMemory.description')}</p>

      <PositionMemory locale={locale} />

      <Divider />

      <Breadcrumb
        items={[
          { label: t('navigation.practice'), href: '/practice' },
          { label: t('practice.positionMemory.title') },
        ]}
        locale={locale}
      />
    </div>
  );
}
