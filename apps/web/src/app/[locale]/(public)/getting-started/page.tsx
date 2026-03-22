import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Button, ChessBoard } from '@/app/_components';
import { SUPPORTED_LOCALES } from '@/config';
import { Link } from '@/i18n/routing';
import { FaChess, FaComments, FaDumbbell } from 'react-icons/fa';

import { PagePanel, PageTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export async function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'gettingStarted' });

  return {
    ...generateCanonicalMetadata({ locale, path: 'getting-started' }),
    title: t('title'),
    description: t('description'),
  };
}

const SIMPLE_FEN = '6k1/8/8/3KQ3/8/8/8/8 w - - 0 1';

export default async function GettingStartedPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'gettingStarted' });

  return (
    <div className="space-y-8">
      <PageTitle>{t('title')}</PageTitle>

      <PagePanel className="space-y-8">
        <p className="text-center text-lg text-muted-foreground">{t('headline')}</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Try */}
          <div className="bg-card border border-border rounded-lg p-6 flex flex-col items-center text-center space-y-4">
            <div className="text-primary text-3xl">
              <FaChess />
            </div>
            <h2 className="text-lg font-semibold text-foreground">{t('cards.try.title')}</h2>
            <div className="w-48">
              <ChessBoard fen={SIMPLE_FEN} showCoordinates={false} />
            </div>
            <div className="mt-auto pt-2 flex flex-col items-center gap-4">
              <Link href={`/games/new/position?fen=${encodeURIComponent(SIMPLE_FEN)}`}>
                <Button asChild variant="primary" size="lg">
                  {t('cards.try.cta')}
                </Button>
              </Link>
              <Link
                href="/games/new/standard"
                className="text-sm text-muted-foreground hover:text-foreground underline"
              >
                {t('cards.try.startFromInitial')}
              </Link>
            </div>
          </div>

          {/* Card 2: Train */}
          <div className="bg-card border border-border rounded-lg p-6 flex flex-col items-center text-center space-y-4">
            <div className="text-primary text-3xl">
              <FaDumbbell />
            </div>
            <h2 className="text-lg font-semibold text-foreground">{t('cards.train.title')}</h2>
            <div className="w-48 bg-muted/30 rounded-lg p-4 flex flex-col items-center justify-center gap-3 aspect-square">
              <p className="text-sm font-bold text-foreground">
                {t('cards.train.previewQuestion')}
              </p>
              <div className="text-6xl">{'\u2658'}</div>
              <div className="grid grid-cols-2 gap-2 w-full">
                <div className="px-2 py-1 bg-success/10 text-success border border-success/30 rounded text-sm font-medium flex items-center justify-center gap-1 opacity-60">
                  <span>○</span>
                </div>
                <div className="px-2 py-1 bg-destructive/10 text-destructive border border-destructive/30 rounded text-sm font-medium flex items-center justify-center gap-1 opacity-60">
                  <span>×</span>
                </div>
              </div>
            </div>
            <div className="mt-auto pt-2 flex flex-col items-center gap-4">
              <Link href="/practice/legal-moves?mode=timed">
                <Button asChild variant="primary" size="lg">
                  {t('cards.train.cta')}
                </Button>
              </Link>
              <Link
                href="/practice"
                className="text-sm text-muted-foreground hover:text-foreground underline"
              >
                {t('cards.train.viewOtherMenus')}
              </Link>
            </div>
          </div>

          {/* Card 3: Community */}
          <div className="bg-card border border-border rounded-lg p-6 flex flex-col items-center text-center space-y-4">
            <div className="text-primary text-3xl">
              <FaComments />
            </div>
            <h2 className="text-lg font-semibold text-foreground">{t('cards.community.title')}</h2>
            <p className="text-sm text-muted-foreground">{t('cards.community.description')}</p>
            <div className="mt-auto pt-2 flex flex-col items-center gap-4">
              <Link href="/topics">
                <Button asChild variant="primary" size="lg">
                  {t('cards.community.cta')}
                </Button>
              </Link>
              <Link
                href="/sign-up"
                className="text-sm text-muted-foreground hover:text-foreground underline"
              >
                {t('cards.community.signUp')}
              </Link>
            </div>
          </div>
        </div>

        <Breadcrumb items={[{ label: t('title') }]} locale={locale} />
      </PagePanel>
    </div>
  );
}
