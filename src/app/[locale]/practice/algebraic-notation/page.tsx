import { getTranslations } from 'next-intl/server';
import { Breadcrumb, PageTitle, PageDescription, Divider } from '@/app/[locale]/_components';
import AlgebraicNotation from './_components/AlgebraicNotation';
import { questions } from './_data/questions';
import type { Locale } from '../../_lib/types';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export default async function AlgebraicNotationPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return (
    <div className="space-y-8">
      <PageTitle>{t('practice.algebraicNotation.pageTitle')}</PageTitle>

      <PageDescription>{t('practice.algebraicNotation.description')}</PageDescription>

      <AlgebraicNotation questions={questions} locale={locale} />

      <Divider />

      <Breadcrumb
        items={[
          { label: t('navigation.practice'), href: '/practice' },
          { label: t('practice.algebraicNotation.pageTitle') },
        ]}
        locale={locale}
      />
    </div>
  );
}
