import { getTranslations } from 'next-intl/server';
import { Breadcrumb, PageTitle } from '@/app/[locale]/_components';
import SquareColorsClient from './_components/SquareColorsClient';
import type { Locale } from '../../_lib/types';

interface SquareColorsPageProps {
  params: Promise<{
    locale: Locale;
  }>;
}

export default async function SquareColorsPage({ params }: SquareColorsPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return (
    <>
      <div className="mb-8">
        <PageTitle>{t('practice.squareColors.title')}</PageTitle>
        <p className="text-muted-foreground">{t('practice.squareColors.description')}</p>
      </div>
      <SquareColorsClient locale={locale} />

      {/* Breadcrumb at bottom */}
      <div className="mt-8 pt-6 border-t border-border">
        <Breadcrumb
          items={[
            { label: t('navigation.practice'), href: '/practice' },
            { label: t('practice.squareColors.title') },
          ]}
          locale={locale}
        />
      </div>
    </>
  );
}
