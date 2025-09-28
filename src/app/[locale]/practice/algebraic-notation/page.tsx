import { getTranslations } from 'next-intl/server';
import { Breadcrumb, PageTitle } from '@/app/[locale]/_components';
import AlgebraicNotationClient from './_components/AlgebraicNotationClient';
import { exercises } from './_lib/algebraic-notation';
import type { Locale } from '../../_lib/types';

interface AlgebraicNotationPageProps {
  params: Promise<{
    locale: Locale;
  }>;
}

export default async function AlgebraicNotationPage({ params }: AlgebraicNotationPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return (
    <>
      <div className="mb-8">
        <PageTitle>{t('practice.algebraicNotation.pageTitle')}</PageTitle>
      </div>
      <AlgebraicNotationClient exercises={exercises} locale={locale} />

      {/* Breadcrumb at bottom */}
      <div className="mt-8 pt-6 border-t border-border">
        <Breadcrumb
          items={[
            { label: t('navigation.practice'), href: '/practice' },
            { label: t('practice.algebraicNotation.pageTitle') },
          ]}
          locale={locale}
        />
      </div>
    </>
  );
}
