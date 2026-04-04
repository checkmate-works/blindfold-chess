import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

import { NewTopicPostLayout } from '@/app/[locale]/(public)/topics/_components/NewTopicPostLayout';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
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

  const title = t('title', { square: square });
  const description = t('description', { square: square });

  return {
    ...generateCanonicalMetadata({
      locale,
      path: `topics/squares/${square}/new`,
      title: title,
      description,
    }),
    title: resolveTitle(title, locale),
    description,
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
    <NewTopicPostLayout
      locale={locale}
      pageTitle={t('squares.pageTitle')}
      sectionTitle={t('squares.newPostForm.title', { square: square })}
      topicVisual={<SquareHighlightBoard square={square} locale={locale} disableLinks />}
      form={<NewPostForm locale={locale} square={square} />}
      breadcrumbItems={[
        { label: t('title'), href: '/topics' },
        { label: t('squares.title'), href: '/topics/squares' },
        { label: square, href: `/topics/squares/${square}` },
        { label: t('squares.newPost') },
      ]}
    />
  );
}
