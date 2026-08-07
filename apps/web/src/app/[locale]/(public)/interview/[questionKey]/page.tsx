import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { Link } from '@/i18n/routing';
import { asc } from 'drizzle-orm';

import { chessOpenings, db } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

import { DeletePostButton } from '@/app/[locale]/(public)/topics/_components/DeletePostButton';
import {
  getOpeningBySlug,
  hasUserPostedForOpening,
} from '@/app/[locale]/(public)/topics/openings/_lib/queries';
import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { OpeningCardWithProvider } from '@/app/[locale]/_components/OpeningCardWithProvider';
import {
  INTERVIEW_QUESTION_KEYS,
  type InterviewQuestionKey,
  QUESTION_CONFIG,
} from '@/app/[locale]/_lib/interview';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { deleteAnswerAction } from './_actions/deleteAnswer';
import { OpeningSelectForm } from './_components/OpeningSelectForm';
import { getInterviewAnswer } from './_lib/queries';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: Locale; questionKey: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, questionKey } = await params;

  if (!(INTERVIEW_QUESTION_KEYS as readonly string[]).includes(questionKey)) {
    return {};
  }

  const t = await getTranslations({ locale, namespace: 'metadata.interviewQuestion' });
  const tQuestions = await getTranslations({ locale, namespace: 'interview.questions' });

  const label = tQuestions(`${questionKey}.label` as never);

  const title = t('title', { label });
  const description = t('description', { label });

  return {
    ...generateCanonicalMetadata({ locale, path: `interview/${questionKey}`, title, description }),
    title: resolveTitle(title, locale),
    description,
  };
}

export default async function InterviewQuestionDetailPage({ params }: Props) {
  const { locale, questionKey } = await params;

  // Validate question key
  if (!(INTERVIEW_QUESTION_KEYS as readonly string[]).includes(questionKey)) {
    notFound();
  }

  const typedKey = questionKey as InterviewQuestionKey;
  const config = QUESTION_CONFIG[typedKey];

  const [t, tDetail, tOpeningNames, supabase] = await Promise.all([
    getTranslations({ locale, namespace: 'interview' }),
    getTranslations({ locale, namespace: 'interview.detail' }),
    getTranslations({ locale, namespace: 'topics.openings.names' }),
    createClient(),
  ]);

  // The viewer lookup (auth is optional here) and the openings master for
  // master_ref questions are independent — fetch both in one round.
  const [
    {
      data: { user },
    },
    allOpenings,
  ] = await Promise.all([
    supabase.auth.getUser(),
    config.answerType === 'master_ref'
      ? db
          .select({
            slug: chessOpenings.slug,
            name: chessOpenings.name,
            fen: chessOpenings.fen,
            ecoCode: chessOpenings.ecoCode,
            pgn: chessOpenings.pgn,
          })
          .from(chessOpenings)
          .orderBy(asc(chessOpenings.sortOrder))
      : null,
  ]);

  // Fetch existing answer for authenticated users
  const answer = user ? await getInterviewAnswer(user.id, questionKey) : null;

  const openings = (allOpenings ?? []).map((o) => {
    const translatedName = tOpeningNames.has(o.slug as never)
      ? tOpeningNames(o.slug as never)
      : o.name;
    return { ...o, translatedName };
  });

  // Fetch full opening record and resolve display name for current answer
  let answerOpening: Awaited<ReturnType<typeof getOpeningBySlug>> = null;
  let answerDisplayName: string | null = null;
  let alreadyPosted = false;
  if (answer && config.answerType === 'master_ref') {
    [answerOpening, alreadyPosted] = await Promise.all([
      getOpeningBySlug(answer.answerValue),
      user ? hasUserPostedForOpening(user.id, answer.answerValue) : false,
    ]);
    answerDisplayName = tOpeningNames.has(answer.answerValue as never)
      ? tOpeningNames(answer.answerValue as never)
      : (answer.openingName ?? answer.answerValue);
  }

  return (
    <PageLayout
      title={t(`questions.${typedKey}.label` as never)}
      locale={locale}
      breadcrumb={[
        { label: t('title'), href: '/interview' },
        { label: t(`questions.${typedKey}.label` as never) },
      ]}
    >
      <SectionTitle>{t(`questions.${typedKey}.description` as never)}</SectionTitle>

      {!user ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{tDetail('signInRequired')}</p>
          <Link
            href="/sign-in"
            locale={locale}
            className="flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {tDetail('signIn')}
          </Link>
          <Link
            href="/sign-up"
            locale={locale}
            className="flex w-full items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            {tDetail('signUp')}
          </Link>
        </div>
      ) : answer ? (
        <>
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              {tDetail('currentAnswer')}
            </p>
            {config.answerType === 'master_ref' && answerOpening && answerDisplayName ? (
              <OpeningCardWithProvider
                opening={answerOpening}
                displayName={answerDisplayName}
                locale={locale}
              />
            ) : (
              <p className="text-sm text-foreground">{answer.answerValue}</p>
            )}
            <div className="flex justify-end mt-3">
              <DeletePostButton
                postId={answer.id}
                locale={locale}
                redirectPath={`/${locale}/interview/${questionKey}`}
                deletePostAction={deleteAnswerAction}
                i18nNamespace="interview.detail.deleteAnswer"
              />
            </div>
          </div>

          {config.answerType === 'master_ref' &&
            answerOpening &&
            answerDisplayName &&
            !alreadyPosted && (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-foreground">
                  {tDetail('sharePrompt', { name: answerDisplayName })}
                </p>
                <Link
                  href={`/topics/openings/${answer.answerValue}`}
                  locale={locale}
                  className="flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  {tDetail('shareLink')}
                </Link>
              </div>
            )}
        </>
      ) : config.answerType === 'master_ref' ? (
        <OpeningSelectForm locale={locale} questionKey={questionKey} openings={openings} />
      ) : null}
    </PageLayout>
  );
}
