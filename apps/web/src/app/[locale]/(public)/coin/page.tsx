import type { ReactNode } from 'react';

import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Image from 'next/image';

import { Button } from '@/app/_components';
import { Link } from '@/i18n/routing';
import { CoinIcon } from '@blindfold-chess/icons';
import {
  FaArrowDown,
  FaBan,
  FaBolt,
  FaCheck,
  FaChessBoard,
  FaGift,
  FaPuzzlePiece,
  FaRegComments,
} from 'react-icons/fa';

import { AD_FREE_DAYS_PER_POINT, MAIA_GAME_POINT_COST, POST_CREATION_POINTS } from '@/lib/points';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import { generateLocaleStaticParams } from '@/app/[locale]/_lib/static-params';
import type { LocalePageProps as Props } from '@/app/[locale]/_lib/types';

/**
 * Coin guide (コインとは)
 *
 * @description
 * Public, fully-static explainer for the Coin economy: how Coins are
 * earned (UGC contributions), what they are spent on (ad-free time, Maia
 * games), and the contribution loop that ties the two together. Visual-led
 * — icon cards and a flow diagram rather than walls of text; detailed edge
 * cases stay in the FAQ.
 *
 * @flow
 * Hero → contribution loop → how to earn → what to spend on → a worked
 * "how much can you earn" example → reassurance facts → CTA.
 */
export const generateStaticParams = generateLocaleStaticParams;

/** Illustrative weekly posting cadence for the "how much can you earn" example. */
const EXAMPLE_POSTS_PER_WEEK = 3;
const WEEKS_PER_MONTH = 4;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'coin' });
  const title = t('title');
  return {
    ...generateCanonicalMetadata({ locale, path: 'coin', title }),
    title: resolveTitle(title, locale),
    description: t('hero.tagline'),
  };
}

function IconBadge({ children, size }: { children: ReactNode; size: 'sm' | 'lg' }) {
  return (
    <div
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-lg bg-foreground/5 text-foreground ${
        size === 'lg' ? 'h-14 w-14 rounded-full' : 'h-12 w-12'
      }`}
    >
      {children}
    </div>
  );
}

/** Arrow that points down when sections stack (mobile) and right in a row (sm+). */
function FlowArrow() {
  return (
    <div className="flex items-center justify-center text-muted-foreground" aria-hidden="true">
      <FaArrowDown className="h-5 w-5 sm:-rotate-90" />
    </div>
  );
}

function LoopStep({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-2 rounded-xl border border-border bg-card p-5 text-center">
      <IconBadge size="lg">{icon}</IconBadge>
      <p className="font-semibold text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function EarnCard({
  icon,
  title,
  note,
  amount,
  unit,
}: {
  icon: ReactNode;
  title: string;
  note?: string;
  amount: number;
  unit: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
      <IconBadge size="sm">{icon}</IconBadge>
      <p className="font-semibold text-foreground">{title}</p>
      {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
      <span className="mt-auto inline-flex w-fit items-center gap-1.5 rounded-full bg-foreground/10 px-3 py-1 text-sm font-bold text-foreground">
        <CoinIcon size={18} aria-hidden="true" />+{amount}
        <span className="font-medium text-muted-foreground">{unit}</span>
      </span>
    </div>
  );
}

function SpendCard({
  icon,
  title,
  rate,
  note,
}: {
  icon: ReactNode;
  title: string;
  rate: string;
  note?: string;
}) {
  return (
    <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-5">
      <IconBadge size="sm">{icon}</IconBadge>
      <div className="flex flex-col gap-1">
        <p className="font-semibold text-foreground">{title}</p>
        <p className="text-sm font-medium text-foreground">{rate}</p>
        {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
      </div>
    </div>
  );
}

function ExampleStat({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1.5 rounded-lg bg-foreground/5 p-4 text-center">
      <span aria-hidden="true" className="text-foreground">
        {icon}
      </span>
      <span className="text-sm font-medium text-foreground">{text}</span>
    </div>
  );
}

function Fact({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <li className="flex items-start gap-2 text-sm text-muted-foreground">
      <span aria-hidden="true" className="mt-0.5 shrink-0 text-foreground">
        {icon}
      </span>
      <span>{text}</span>
    </li>
  );
}

export default async function CoinPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'coin' });

  const unit = t('unit');
  const exampleCoins = EXAMPLE_POSTS_PER_WEEK * POST_CREATION_POINTS * WEEKS_PER_MONTH;
  const exampleDays = exampleCoins * AD_FREE_DAYS_PER_POINT;

  return (
    <PageLayout title={t('title')} locale={locale} breadcrumb={[{ label: t('title') }]}>
      <div className="space-y-14">
        {/* Hero */}
        <section className="flex flex-col items-center gap-4 text-center">
          <CoinIcon size={76} aria-hidden="true" />
          <p className="max-w-prose text-base text-muted-foreground sm:text-lg">
            {t('hero.tagline')}
          </p>
        </section>

        {/* Contribution loop */}
        <section className="space-y-4">
          <SectionTitle>{t('loop.heading')}</SectionTitle>
          <div className="flex flex-col items-stretch gap-3 sm:flex-row">
            <LoopStep
              icon={<FaPuzzlePiece className="h-6 w-6" />}
              title={t('loop.step1Title')}
              body={t('loop.step1Body')}
            />
            <FlowArrow />
            <LoopStep
              icon={<CoinIcon size={28} aria-hidden="true" />}
              title={t('loop.step2Title')}
              body={t('loop.step2Body')}
            />
            <FlowArrow />
            <LoopStep
              icon={<FaGift className="h-6 w-6" />}
              title={t('loop.step3Title')}
              body={t('loop.step3Body')}
            />
          </div>
          <p className="text-center text-sm text-muted-foreground">{t('loop.closing')}</p>
        </section>

        {/* How to earn */}
        <section className="space-y-4">
          <SectionTitle>{t('earn.heading')}</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-3">
            <EarnCard
              icon={<FaPuzzlePiece className="h-6 w-6" />}
              title={t('earn.puzzleTitle')}
              amount={POST_CREATION_POINTS}
              unit={unit}
            />
            <EarnCard
              icon={<FaChessBoard className="h-6 w-6" />}
              title={t('earn.positionMemoryTitle')}
              amount={POST_CREATION_POINTS}
              unit={unit}
            />
            <EarnCard
              icon={<FaRegComments className="h-6 w-6" />}
              title={t('earn.topicTitle')}
              note={t('earn.topicNote')}
              amount={POST_CREATION_POINTS}
              unit={unit}
            />
          </div>
        </section>

        {/* What to spend on */}
        <section className="space-y-4">
          <SectionTitle>{t('spend.heading')}</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <SpendCard
              icon={<FaBan className="h-6 w-6" />}
              title={t('spend.adFreeTitle')}
              rate={t('spend.adFreeRate', { days: AD_FREE_DAYS_PER_POINT })}
            />
            <SpendCard
              icon={
                <Image
                  src="/images/engines/maia.png"
                  alt=""
                  width={32}
                  height={32}
                  className="object-contain"
                />
              }
              title={t('spend.maiaTitle')}
              rate={t('spend.maiaRate', { cost: MAIA_GAME_POINT_COST })}
              note={t('spend.maiaNote')}
            />
          </div>
        </section>

        {/* Worked example */}
        <section className="space-y-4">
          <SectionTitle>{t('example.heading')}</SectionTitle>
          <div className="rounded-xl border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">{t('example.lead')}</p>
            <div className="mt-4 flex flex-col items-stretch gap-3 sm:flex-row">
              <ExampleStat
                icon={<FaPuzzlePiece className="h-5 w-5" />}
                text={t('example.posts', { posts: EXAMPLE_POSTS_PER_WEEK })}
              />
              <FlowArrow />
              <ExampleStat
                icon={<CoinIcon size={22} aria-hidden="true" />}
                text={t('example.coins', { coins: exampleCoins })}
              />
              <FlowArrow />
              <ExampleStat
                icon={<FaBan className="h-5 w-5" />}
                text={t('example.days', { days: exampleDays })}
              />
            </div>
          </div>
        </section>

        {/* Reassurance facts */}
        <section className="space-y-4">
          <SectionTitle>{t('facts.heading')}</SectionTitle>
          <ul className="space-y-2">
            <Fact icon={<FaBolt className="h-4 w-4" />} text={t('facts.instant')} />
            <Fact icon={<FaCheck className="h-4 w-4" />} text={t('facts.keep')} />
            <Fact icon={<FaCheck className="h-4 w-4" />} text={t('facts.balance')} />
          </ul>
        </section>

        {/* CTA */}
        <section className="flex flex-col gap-3 sm:flex-row">
          <Link href="/mypage/points" locale={locale} className="flex-1">
            <Button asChild variant="primary" size="lg" fullWidth>
              {t('cta.viewBalance')}
            </Button>
          </Link>
          <Link href="/topics" locale={locale} className="flex-1">
            <Button asChild variant="secondary" size="lg" fullWidth>
              {t('cta.contribute')}
            </Button>
          </Link>
        </section>
      </div>
    </PageLayout>
  );
}
