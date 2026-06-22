import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Button, ChessBoard } from '@/app/_components';
import { Link } from '@/i18n/routing';
import { FaChess, FaComments, FaDumbbell } from 'react-icons/fa';

import { RankCard } from '@/app/[locale]/(public)/ranks/_components/RankCard';
import { buildRankTeaserCards } from '@/app/[locale]/(public)/ranks/_lib/helpers';
import { PageLayout } from '@/app/[locale]/_components';
import { TEXT_LINK_MUTED_CLASSES } from '@/app/[locale]/_lib/link-classes';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import { generateLocaleStaticParams } from '@/app/[locale]/_lib/static-params';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export const generateStaticParams = generateLocaleStaticParams;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return createPageMetadata({
    params,
    namespace: 'metadata.gettingStarted',
    path: 'getting-started',
  });
}

const SIMPLE_FEN = '6k1/8/8/3KQ3/8/8/8/8 w - - 0 1';

export default async function GettingStartedPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'gettingStarted' });
  const tRanks = await getTranslations({ locale, namespace: 'ranks' });

  const teaserCards = buildRankTeaserCards(locale, tRanks).map((props) => (
    <RankCard key={props.slug} {...props} />
  ));

  return (
    <PageLayout
      title={t('title')}
      locale={locale}
      breadcrumb={[{ label: t('title') }]}
      panelClassName="space-y-8"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Try */}
        <div className="bg-card border border-border rounded-lg p-6 flex flex-col items-center text-center gap-4">
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
            <div className="flex min-h-[2.5rem] items-start justify-center">
              <Link href="/games/new/standard" className={`text-sm ${TEXT_LINK_MUTED_CLASSES}`}>
                {t('cards.try.startFromInitial')}
              </Link>
            </div>
          </div>
        </div>

        {/* Card 2: Train */}
        <div className="bg-card border border-border rounded-lg p-6 flex flex-col items-center text-center gap-4">
          <div className="text-primary text-3xl">
            <FaDumbbell />
          </div>
          <h2 className="text-lg font-semibold text-foreground">{t('cards.train.title')}</h2>
          <div className="w-48 bg-muted/30 rounded-lg p-4 flex flex-col items-center justify-center gap-3 aspect-square">
            <p className="text-sm font-bold text-foreground">{t('cards.train.previewQuestion')}</p>
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
          <p className="text-sm text-muted-foreground">{t('cards.train.description')}</p>
          <div className="mt-auto pt-2 flex flex-col items-center gap-4">
            <Link href="/practice/legal-moves?mode=timed">
              <Button asChild variant="primary" size="lg">
                {t('cards.train.cta')}
              </Button>
            </Link>
            <div className="flex min-h-[2.5rem] items-start justify-center">
              <Link href="/practice" className={`text-sm ${TEXT_LINK_MUTED_CLASSES}`}>
                {t('cards.train.viewOtherMenus')}
              </Link>
            </div>
          </div>
        </div>

        {/* Card 3: Community */}
        <div className="bg-card border border-border rounded-lg p-6 flex flex-col items-center text-center gap-4">
          <div className="text-primary text-3xl">
            <FaComments />
          </div>
          <h2 className="text-lg font-semibold text-foreground">{t('cards.community.title')}</h2>
          <div className="w-48 aspect-square bg-muted/30 rounded-lg p-3 flex flex-col justify-center gap-2">
            <div className="flex items-end gap-1.5">
              <div className="w-5 h-5 rounded-full bg-muted-foreground/30 shrink-0" />
              <div className="rounded-lg rounded-bl-sm bg-card border border-border px-2 py-1 text-xs text-foreground text-left">
                {t('cards.community.preview.msg1')}
              </div>
            </div>
            <div className="flex flex-row-reverse items-end gap-1.5">
              <div className="w-5 h-5 rounded-full bg-primary/30 shrink-0" />
              <div className="rounded-lg rounded-br-sm bg-primary/10 border border-primary/30 px-2 py-1 text-xs text-foreground text-left">
                {t('cards.community.preview.msg2')}
              </div>
            </div>
            <div className="flex items-end gap-1.5">
              <div className="w-5 h-5 rounded-full bg-muted-foreground/30 shrink-0" />
              <div className="rounded-lg rounded-bl-sm bg-card border border-border px-2 py-1 text-xs text-foreground text-left">
                {t('cards.community.preview.msg3')}
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{t('cards.community.description')}</p>
          <div className="mt-auto pt-2 flex flex-col items-center gap-4">
            <Link href="/topics">
              <Button asChild variant="primary" size="lg">
                {t('cards.community.cta')}
              </Button>
            </Link>
            <div className="flex min-h-[2.5rem] items-start justify-center">
              <Link href="/sign-up" className={`text-sm ${TEXT_LINK_MUTED_CLASSES}`}>
                {t('cards.community.signUp')}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Belt Ranks Teaser */}
      <section className="space-y-6">
        <h2 className="text-xl font-bold text-foreground text-center">{t('ranks.title')}</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{teaserCards}</div>

        <div className="text-center">
          <Link href="/ranks">
            <Button asChild variant="primary" size="lg">
              {t('ranks.viewAll')}
            </Button>
          </Link>
        </div>
      </section>
    </PageLayout>
  );
}
