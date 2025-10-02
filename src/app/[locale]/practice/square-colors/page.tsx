import { getTranslations } from 'next-intl/server';
import { Breadcrumb, PageTitle, PageDescription, Divider } from '@/app/[locale]/_components';
import SquareColors from './_components/SquareColors';
import type { Locale } from '../../_lib/types';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export default async function SquareColorsPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return (
    <div className="space-y-8">
      <PageTitle>{t('practice.squareColors.title')}</PageTitle>

      <PageDescription>{t('practice.squareColors.description')}</PageDescription>

      <SquareColors locale={locale} />

      <Divider />

      <Breadcrumb
        items={[
          { label: t('navigation.practice'), href: '/practice' },
          { label: t('practice.squareColors.title') },
        ]}
        locale={locale}
      />
    </div>
  );
}
