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
  FaChevronRight,
  FaGift,
  FaPuzzlePiece,
  FaRegComments,
} from 'react-icons/fa';

import { AD_FREE_DAYS_PER_POINT, MAIA_GAME_POINT_COST, POST_CREATION_POINTS } from '@/lib/points';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import { generateLocaleStaticParams } from '@/app/[locale]/_lib/static-params';
import type { Locale, LocalePageProps as Props } from '@/app/[locale]/_lib/types';

/**
 * Coin guide (コイン)
 *
 * @description
 * Public, fully-static explainer for the Coin economy: how Coins are
 * earned (UGC contributions), what they are spent on (ad-free time, Maia
 * games), and the contribution loop that ties the two together. Visual-led
 * — icon cards and a flow diagram rather than walls of text; detailed edge
 * cases stay in the FAQ.
 */
export const generateStaticParams = generateLocaleStaticParams;

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
      className={`flex shrink-0 items-center justify-center bg-foreground/5 text-foreground ${
        size === 'lg' ? 'h-14 w-14 rounded-full' : 'h-12 w-12 rounded-lg'
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
  href,
  locale,
  icon,
  title,
  amount,
  unit,
}: {
  href: string;
  locale: Locale;
  icon: ReactNode;
  title: string;
  amount: number;
  unit: string;
}) {
  return (
    <Link
      href={href}
      locale={locale}
      className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-sm"
    >
      <div className="flex items-center justify-between">
        <IconBadge size="sm">{icon}</IconBadge>
        <FaChevronRight
          aria-hidden="true"
          className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
        />
      </div>
      <p className="font-semibold text-foreground underline-offset-2 group-hover:underline">
        {title}
      </p>
      <span className="mt-auto inline-flex w-fit items-center gap-1.5 rounded-full bg-foreground/10 px-3 py-1 text-sm font-bold text-foreground">
        <CoinIcon size={18} aria-hidden="true" />+{amount}
        <span className="font-medium text-muted-foreground">{unit}</span>
      </span>
    </Link>
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

  return (
    <PageLayout title={t('title')} locale={locale} breadcrumb={[{ label: t('title') }]}>
      <div className="space-y-8">
        <SectionTitle>{t('earn.heading')}</SectionTitle>

        {/* Hero */}
        <div className="flex flex-col items-center gap-4 text-center">
          <CoinIcon size={76} aria-hidden="true" />
          <p className="max-w-prose text-base text-muted-foreground sm:text-lg">
            {t('hero.tagline')}
          </p>
        </div>

        {/* Contribution loop */}
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

        {/* Ways to earn */}
        <div className="space-y-3">
          <div className="grid gap-4 sm:grid-cols-3">
            <EarnCard
              href="/practice/puzzle/new"
              locale={locale}
              icon={<FaPuzzlePiece className="h-6 w-6" />}
              title={t('earn.puzzleTitle')}
              amount={POST_CREATION_POINTS}
              unit={unit}
            />
            <EarnCard
              href="/practice/position-memory/new"
              locale={locale}
              icon={<FaChessBoard className="h-6 w-6" />}
              title={t('earn.positionMemoryTitle')}
              amount={POST_CREATION_POINTS}
              unit={unit}
            />
            <EarnCard
              href="/topics"
              locale={locale}
              icon={<FaRegComments className="h-6 w-6" />}
              title={t('earn.topicTitle')}
              amount={POST_CREATION_POINTS}
              unit={unit}
            />
          </div>
          <p className="text-center text-sm text-muted-foreground">
            <span aria-hidden="true">❤️</span> {t('earn.likeNote1')}
            <br />
            {t('earn.likeNote2')}
          </p>
        </div>

        {/* What Coins are for */}
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

        {/* Reassurance facts */}
        <ul className="space-y-2">
          <Fact icon={<FaBolt className="h-4 w-4" />} text={t('facts.instant')} />
          <Fact icon={<FaCheck className="h-4 w-4" />} text={t('facts.keep')} />
          <Fact icon={<FaCheck className="h-4 w-4" />} text={t('facts.balance')} />
        </ul>

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
