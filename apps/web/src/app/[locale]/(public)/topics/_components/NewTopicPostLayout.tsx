import type { ReactNode } from 'react';

import { Divider, PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import type { Locale } from '@/app/[locale]/_lib/types';

type BreadcrumbItem = {
  label: string;
  href?: string;
};

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
    <div className="space-y-8">
      <PageTitle>{pageTitle}</PageTitle>

      <PagePanel>
        <SectionTitle>{sectionTitle}</SectionTitle>

        {topicVisual}

        {form}

        <Divider />

        <Breadcrumb items={breadcrumbItems} locale={locale} />
      </PagePanel>
    </div>
  );
}
