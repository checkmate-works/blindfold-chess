/**
 * Kata Check (型チェック)
 *
 * @description Compares a finished game's opening against the repertoires (型)
 * the signed-in user registered for the colour they played, and reports — per
 * repertoire — whether the game stayed on kata, deviated at the player's own
 * move, or ran into an unprepared opponent move.
 * @flow Game finishes → the finish modal's Kata card deep-links here with the
 * game's SAN moves in the URL (like Recall, the page has no game-loading
 * logic) → the server matches them against the user's repertoires and renders
 * the report; anonymous visitors get a sign-in prompt, users without a
 * matching-side repertoire get a register CTA.
 */
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';

import { getOptionalUser } from '@/lib/auth';
import { getKataReport } from '@/lib/repertoires/kata-report';

import { PageLayout } from '@/app/[locale]/_components';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import { generateLocaleStaticParams } from '@/app/[locale]/_lib/static-params';
import type { Locale } from '@/app/[locale]/_lib/types';

import { KataReportCard } from './_components/KataReportCard';

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const generateStaticParams = generateLocaleStaticParams;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'play' });
  const title = t('kataPage.title');

  return {
    ...generateCanonicalMetadata({ locale, path: 'games/play/kata', title }),
    title: resolveTitle(title, locale),
  };
}

/** The `moves` param is the same JSON SAN array the Recall deep-link carries. */
function parseMoves(param: string | string[] | undefined): string[] | null {
  if (typeof param !== 'string') return null;
  try {
    const parsed: unknown = JSON.parse(param);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed.every((m) => typeof m === 'string')) {
      return parsed;
    }
  } catch {
    // Malformed JSON → treated as missing.
  }
  return null;
}

const PRIMARY_LINK =
  'inline-block rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors';
const SECONDARY_LINK =
  'inline-block rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors';

function EmptyState({ message, children }: { message: string; children?: React.ReactNode }) {
  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-6 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
      {children && <div className="flex flex-wrap justify-center gap-3">{children}</div>}
    </div>
  );
}

export default async function KataPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'play' });
  const sp = await searchParams;

  const moves = parseMoves(sp.moves);
  const playerColor = sp.color === 'black' ? 'black' : 'white';
  const startingFen = typeof sp.fen === 'string' && sp.fen ? sp.fen : undefined;
  const gameId = typeof sp.gameId === 'string' && sp.gameId ? sp.gameId : undefined;

  const user = await getOptionalUser();

  let content: React.ReactNode;
  if (!moves) {
    content = (
      <EmptyState message={t('kataPage.invalid')}>
        <Link href={`/${locale}/games/play`} className={PRIMARY_LINK}>
          {t('kataPage.backToPlay')}
        </Link>
      </EmptyState>
    );
  } else if (!user) {
    content = (
      <EmptyState message={t('kataPage.signInRequired')}>
        <Link href={`/${locale}/sign-in`} className={PRIMARY_LINK}>
          {t('kataPage.signIn')}
        </Link>
      </EmptyState>
    );
  } else {
    const report = await getKataReport({ userId: user.id, moves, playerColor, startingFen });
    const side = t(`kataPage.side_${playerColor}`);

    if (!report.hasRepertoiresForSide) {
      content = (
        <EmptyState message={t('kataPage.noRepertoires', { side })}>
          <Link href={`/${locale}/repertoires/new`} className={PRIMARY_LINK}>
            {t('kataPage.registerCta')}
          </Link>
          <Link href={`/${locale}/repertoires`} className={SECONDARY_LINK}>
            {t('kataPage.viewRepertoires')}
          </Link>
        </EmptyState>
      );
    } else if (report.entries.length === 0) {
      content = (
        <EmptyState message={t('kataPage.noneApplicable')}>
          <Link href={`/${locale}/repertoires/new`} className={PRIMARY_LINK}>
            {t('kataPage.registerCta')}
          </Link>
          <Link href={`/${locale}/repertoires`} className={SECONDARY_LINK}>
            {t('kataPage.viewRepertoires')}
          </Link>
        </EmptyState>
      );
    } else {
      content = (
        <>
          <p className="text-sm text-muted-foreground">{t('kataPage.lead', { side })}</p>
          <div className="space-y-4">
            {report.entries.map((entry) => (
              <KataReportCard
                key={entry.repertoire.id}
                entry={entry}
                locale={locale}
                playerColor={playerColor}
              />
            ))}
          </div>
        </>
      );
    }
  }

  return (
    <PageLayout title={t('kataPage.title')} locale={locale}>
      {content}

      {gameId && (
        <p className="text-center">
          <Link
            href={`/${locale}/games/play/result?gameId=${gameId}`}
            className="text-sm text-muted-foreground hover:text-foreground hover:underline"
          >
            {t('kataPage.backToResult')}
          </Link>
        </p>
      )}
    </PageLayout>
  );
}
