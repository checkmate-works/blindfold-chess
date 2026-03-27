import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/routing';

import { createClient } from '@/lib/supabase/server';

import { Divider, PagePanel, PageTitle } from '@/app/[locale]/_components';
import { AdBannerGuard } from '@/app/[locale]/_components/AdBanner/AdBannerGuard';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { INTERVIEW_QUESTION_KEYS, QUESTION_CONFIG } from '@/app/[locale]/_lib/interview';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { LocalePageProps as Props } from '@/app/[locale]/_lib/types';

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
  const tOpeningNames = await getTranslations({ locale, namespace: 'topics.openings.names' });

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
        <dl className="space-y-6">
          {INTERVIEW_QUESTION_KEYS.map((key) => {
            const answer = answerMap.get(key);
            const config = QUESTION_CONFIG[key];

            return (
              <div key={key}>
                <dt className="text-sm font-medium text-foreground">
                  {t(`questions.${key}.label` as never)}
                </dt>
                <dd className="mt-1 text-sm text-muted-foreground">
                  {t(`questions.${key}.description` as never)}
                </dd>
                {user && (
                  <dd className="mt-2">
                    {answer ? (
                      <AnswerDisplay
                        answer={answer}
                        config={config}
                        locale={locale}
                        tOpeningNames={tOpeningNames}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground italic">{t('noAnswer')}</p>
                    )}
                  </dd>
                )}
              </div>
            );
          })}
        </dl>

        <AdBannerGuard slot="banner-standard" />

        <Divider />

        <Breadcrumb items={[{ label: t('title') }]} locale={locale} />
      </PagePanel>
    </div>
  );
}

// Render the answer value based on the question's answer type
function AnswerDisplay({
  answer,
  config,
  locale,
  tOpeningNames,
}: {
  answer: InterviewAnswerRow;
  config: { answerType: 'master_ref' | 'choice' | 'free_text' };
  locale: string;
  tOpeningNames: Awaited<ReturnType<typeof getTranslations>>;
}) {
  if (config.answerType === 'master_ref') {
    const translated = tOpeningNames(answer.answerValue as never);
    const displayName =
      translated === `topics.openings.names.${answer.answerValue}`
        ? (answer.openingName ?? answer.answerValue)
        : translated;

    return (
      <Link
        href={`/topics/openings/${answer.answerValue}`}
        locale={locale}
        className="text-sm text-link hover:underline"
      >
        {displayName}
      </Link>
    );
  }

  // For choice or free_text types (future use)
  return <p className="text-sm text-foreground">{answer.answerValue}</p>;
}
