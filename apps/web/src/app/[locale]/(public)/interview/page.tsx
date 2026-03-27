import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { createClient } from '@/lib/supabase/server';

import { Divider, PagePanel, PageTitle } from '@/app/[locale]/_components';
import { AdBannerGuard } from '@/app/[locale]/_components/AdBanner/AdBannerGuard';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { INTERVIEW_QUESTION_KEYS } from '@/app/[locale]/_lib/interview';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { LocalePageProps as Props } from '@/app/[locale]/_lib/types';

import { InterviewQuestionCard } from './_components/InterviewQuestionCard';
import { type InterviewAnswerRow, getInterviewAnswers } from './_lib/queries';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.interview' });

  return {
    ...generateCanonicalMetadata({ locale, path: 'interview' }),
    title: t('title'),
    description: t('description'),
  };
}

export default async function InterviewPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'interview' });

  // Check auth state without requiring login
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Only fetch answers for authenticated users
  const answers: InterviewAnswerRow[] = user ? await getInterviewAnswers(user.id) : [];
  const answerMap = new Map(answers.map((a) => [a.questionKey, a]));

  return (
    <div className="space-y-8">
      <PageTitle>{t('title')}</PageTitle>

      <PagePanel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {INTERVIEW_QUESTION_KEYS.map((key) => {
            const answer = answerMap.get(key);

            return (
              <InterviewQuestionCard
                key={key}
                questionKey={key}
                label={t(`questions.${key}.label` as never)}
                description={t(`questions.${key}.description` as never)}
                isAuthenticated={!!user}
                isAnswered={!!answer}
                answeredLabel={t('answered')}
                notAnsweredLabel={t('noAnswer')}
                locale={locale}
              />
            );
          })}
        </div>

        <AdBannerGuard slot="banner-standard" />

        <Divider />

        <Breadcrumb items={[{ label: t('title') }]} locale={locale} />
      </PagePanel>
    </div>
  );
}
