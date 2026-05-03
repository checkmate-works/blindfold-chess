import type { ReactNode } from 'react';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import type { BreadcrumbItem } from '@/app/[locale]/_components/Breadcrumb';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  locale: Locale;
  pageTitle: string;
  sectionTitle: string;
  /** Topic-specific visual (board component) */
  topicVisual: ReactNode;
  /** The new post form component */
  form: ReactNode;
  /** Breadcrumb items */
  breadcrumbItems: BreadcrumbItem[];
};

export function NewTopicPostLayout({
  locale,
  pageTitle,
  sectionTitle,
  topicVisual,
  form,
  breadcrumbItems,
}: Props) {
  return (
    <PageLayout title={pageTitle} locale={locale} breadcrumb={breadcrumbItems}>
      <SectionTitle>{sectionTitle}</SectionTitle>

      {topicVisual}

      {form}
    </PageLayout>
  );
}
