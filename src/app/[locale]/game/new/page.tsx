import { getTranslations } from 'next-intl/server';
import { PageTitle } from '@/app/[locale]/_components';
import { NewGameForm } from './_components/NewGameForm';
import type { Locale } from '../../_lib/types';

interface NewGamePageProps {
  params: Promise<{
    locale: Locale;
  }>;
}

export default async function NewGamePage({ params }: NewGamePageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return (
    <>
      <div className="mb-8">
        <PageTitle>{t('newGame.title')}</PageTitle>
      </div>
      <NewGameForm locale={locale} />
    </>
  );
}
