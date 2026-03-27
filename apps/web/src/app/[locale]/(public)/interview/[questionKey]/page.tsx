import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { Link } from '@/i18n/routing';
import { asc } from 'drizzle-orm';

import { chessOpenings, db } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

import { Divider, PagePanel, PageTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import {
  INTERVIEW_QUESTION_KEYS,
  type InterviewQuestionKey,
  QUESTION_CONFIG,
} from '@/app/[locale]/_lib/interview';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { DeleteAnswerButton } from './_components/DeleteAnswerButton';
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

  return {
    ...generateCanonicalMetadata({ locale, path: `interview/${questionKey}` }),
    title: t('title', { label }),
    description: t('description', { label }),
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
  let openings: { slug: string; name: string; translatedName: string }[] = [];
  if (config.answerType === 'master_ref') {
    const allOpenings = await db
      .select({ slug: chessOpenings.slug, name: chessOpenings.name })
      .from(chessOpenings)
      .orderBy(asc(chessOpenings.sortOrder));

    openings = allOpenings.map((o) => {
      const translated = tOpeningNames(o.slug as never);
      const translatedName = translated === `topics.openings.names.${o.slug}` ? o.name : translated;
      return { ...o, translatedName };
    });
  }

  // Resolve display name for current answer
  let answerDisplayName: string | null = null;
  if (answer && config.answerType === 'master_ref') {
    const translated = tOpeningNames(answer.answerValue as never);
    answerDisplayName =
      translated === `topics.openings.names.${answer.answerValue}`
        ? (answer.openingName ?? answer.answerValue)
        : translated;
  }

  return (
    <div className="space-y-8">
      <PageTitle>{t(`questions.${typedKey}.label` as never)}</PageTitle>

      <PagePanel>
        <p className="text-sm text-muted-foreground mb-6">
          {t(`questions.${typedKey}.description` as never)}
        </p>

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
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="text-xs font-medium text-muted-foreground mb-1">
                {tDetail('currentAnswer')}
              </p>
              {config.answerType === 'master_ref' ? (
                <Link
                  href={`/topics/openings/${answer.answerValue}`}
                  locale={locale}
                  className="text-sm text-link hover:underline"
                >
                  {answerDisplayName}
                </Link>
              ) : (
                <p className="text-sm text-foreground">{answer.answerValue}</p>
              )}
            </div>
            <DeleteAnswerButton questionKey={questionKey} locale={locale} />
          </div>
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
