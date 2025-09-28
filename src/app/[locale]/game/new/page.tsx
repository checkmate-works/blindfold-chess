import { getTranslations } from 'next-intl/server';
import { PageTitle, Breadcrumb, Divider } from '@/app/[locale]/_components';
import { NewGameForm } from './_components/NewGameForm';
import { GameLimitCheck } from './_components/GameLimitCheck';
import type { Locale } from '../../_lib/types';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export default async function NewGamePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return (
    <div className="space-y-8">
      <PageTitle>{t('newGame.title')}</PageTitle>
      <GameLimitCheck locale={locale}>
        <NewGameForm locale={locale} />
        <Divider />
        <Breadcrumb locale={locale} items={[{ label: t('newGame.title') }]} />
      </GameLimitCheck>
    </div>
  );
}
