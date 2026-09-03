import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { PageLayout } from '@/app/[locale]/_components';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { LocalePageProps as Props } from '@/app/[locale]/_lib/types';

import { InterviewQuestionGrid } from './_components/InterviewQuestionGrid';

// No `revalidate` of its own: interview questions are code-defined
// (`INTERVIEW_QUESTION_KEYS`) and the labels are i18n-driven, so the page only
// changes on deploy, and the per-user "answered ✓" badge is overlaid
// client-side by `InterviewQuestionGrid` after hydration. Nothing here wants a
// shorter interval than the layout's.

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return createPageMetadata({ params, namespace: 'metadata.interview', path: 'interview' });
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
