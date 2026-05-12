import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { PageLayout } from '@/app/[locale]/_components';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { LocalePageProps as Props } from '@/app/[locale]/_lib/types';

import { InterviewQuestionGrid } from './_components/InterviewQuestionGrid';

// Interview questions are code-defined (`INTERVIEW_QUESTION_KEYS`) and the
// labels are i18n-driven, so the page itself only changes on deploy. The
// per-user "answered ✓" badge is overlaid client-side by
// `InterviewQuestionGrid` after hydration.
export const revalidate = 3600;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.interview' });

  const title = t('title');
  const description = t('description');

  return {
    ...generateCanonicalMetadata({ locale, path: 'interview', title, description }),
    title: resolveTitle(title, locale),
    description,
  };
}

export default async function InterviewPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'interview' });

  return (
    <PageLayout title={t('title')} locale={locale} breadcrumb={[{ label: t('title') }]}>
      <InterviewQuestionGrid locale={locale} />
    </PageLayout>
  );
}
