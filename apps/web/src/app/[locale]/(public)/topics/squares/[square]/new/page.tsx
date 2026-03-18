import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

import { Divider, PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { isValidSquare } from '../../_lib/squares';
import { SquareHighlightBoard } from '../_components';
import { NewPostForm } from './_components';

type Props = {
  params: Promise<{ locale: Locale; square: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, square } = await params;

  if (!isValidSquare(square)) {
    return {};
  }

  const t = await getTranslations({ locale, namespace: 'metadata.topicsSquareNewPost' });

  return {
    ...generateCanonicalMetadata({ locale, path: `topics/squares/${square}/new` }),
    title: t('title', { square: square }),
    description: t('description', { square: square }),
  };
}

export default async function NewPostPage({ params }: Props) {
  const { locale, square } = await params;

  if (!isValidSquare(square)) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/sign-in?toast=sign_in_required`);
  }

  const t = await getTranslations({ locale, namespace: 'topics' });

  return (
    <div className="space-y-8">
      <PageTitle>{t('squares.pageTitle')}</PageTitle>

      <PagePanel>
        <SectionTitle>{t('squares.newPostForm.title', { square: square })}</SectionTitle>

        <SquareHighlightBoard square={square} locale={locale} disableLinks />

        <NewPostForm locale={locale} square={square} />

        <Divider />

        <Breadcrumb
          items={[
            { label: t('title'), href: '/topics' },
            { label: t('squares.title'), href: '/topics/squares' },
            { label: square, href: `/topics/squares/${square}` },
            { label: t('squares.newPost') },
          ]}
          locale={locale}
        />
      </PagePanel>
    </div>
  );
}
