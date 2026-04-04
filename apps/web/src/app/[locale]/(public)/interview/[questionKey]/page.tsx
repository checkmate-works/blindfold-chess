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
import { Divider, PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
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

  const t = await getTranslations({ locale, namespace: 'interview' });
  const tDetail = await getTranslations({ locale, namespace: 'interview.detail' });
  const tOpeningNames = await getTranslations({ locale, namespace: 'topics.openings.names' });

  // Check auth state without requiring login
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch existing answer for authenticated users
  const answer = user ? await getInterviewAnswer(user.id, questionKey) : null;

  // Fetch openings for master_ref type questions
  let openings: {
    slug: string;
    name: string;
    fen: string;
    ecoCode: string;
    pgn: string;
    translatedName: string;
  }[] = [];
  if (config.answerType === 'master_ref') {
    const allOpenings = await db
      .select({
        slug: chessOpenings.slug,
        name: chessOpenings.name,
        fen: chessOpenings.fen,
        ecoCode: chessOpenings.ecoCode,
        pgn: chessOpenings.pgn,
      })
      .from(chessOpenings)
      .orderBy(asc(chessOpenings.sortOrder));

    openings = allOpenings.map((o) => {
      const translatedName = tOpeningNames.has(o.slug as never)
        ? tOpeningNames(o.slug as never)
        : o.name;
      return { ...o, translatedName };
    });
  }

  // Fetch full opening record and resolve display name for current answer
  let answerOpening: Awaited<ReturnType<typeof getOpeningBySlug>> = null;
  let answerDisplayName: string | null = null;
  let alreadyPosted = false;
  if (answer && config.answerType === 'master_ref') {
    answerOpening = await getOpeningBySlug(answer.answerValue);
    answerDisplayName = tOpeningNames.has(answer.answerValue as never)
      ? tOpeningNames(answer.answerValue as never)
      : (answer.openingName ?? answer.answerValue);
    if (user) {
      alreadyPosted = await hasUserPostedForOpening(user.id, answer.answerValue);
    }
  }

  return (
    <div className="space-y-8">
      <PageTitle>{t(`questions.${typedKey}.label` as never)}</PageTitle>

      <PagePanel>
        <SectionTitle>{t(`questions.${typedKey}.description` as never)}</SectionTitle>

        {!user ? (
          <div className="rounded-lg border border-border bg-muted/50 p-6 text-center space-y-4">
            <p className="text-sm text-muted-foreground">{tDetail('signInRequired')}</p>
            <div className="flex justify-center gap-3">
              <Link
                href="/sign-in"
                locale={locale}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {tDetail('signIn')}
              </Link>
              <Link
                href="/sign-up"
                locale={locale}
                className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                {tDetail('signUp')}
              </Link>
            </div>
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
                <div className="rounded-lg border border-border bg-muted/30 p-4 mt-4 space-y-3">
                  <p className="text-sm text-foreground">
                    {tDetail('sharePrompt', { name: answerDisplayName })}
                  </p>
                  <Link
                    href={`/topics/openings/${answer.answerValue}/new`}
                    locale={locale}
                    className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    {tDetail('shareLink')}
                  </Link>
                </div>
              )}
          </>
        ) : config.answerType === 'master_ref' ? (
          <OpeningSelectForm locale={locale} questionKey={questionKey} openings={openings} />
        ) : null}

        <Divider />

        <Breadcrumb
          items={[
            { label: t('title'), href: '/interview' },
            { label: t(`questions.${typedKey}.label` as never) },
          ]}
          locale={locale}
        />
      </PagePanel>
    </div>
  );
}
