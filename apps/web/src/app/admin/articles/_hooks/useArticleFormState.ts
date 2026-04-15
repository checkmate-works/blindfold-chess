'use client';

import { useMemo, useState } from 'react';

import type { ArticleEditData, ContentFormat, TiptapJsonContent } from '../_lib/types';

type UseArticleFormStateArgs = {
  contentFormat: ContentFormat;
  defaultValues?: ArticleEditData;
  defaultSlug?: string;
  defaultLocale?: string;
};

type ArticleFormState = {
  slug: string;
  title: string;
  contentJson: TiptapJsonContent | null;
  markdownContent: string;
  locale: string;
  excerpt: string;
  description: string;
  categoryId: string;
  icon: string;
};

/**
 * Shallow equality check for article form state against its initial snapshot.
 *
 * `contentJson` uses `JSON.stringify` comparison because Tiptap JSON is
 * a deeply nested structure; reference equality would not survive editor
 * updates. For `markdown` format, `content` is compared directly.
 */
function shallowEqualArticleData(
  current: ArticleFormState,
  initial: ArticleFormState,
  contentFormat: ContentFormat
): boolean {
  const contentEqual =
    contentFormat === 'markdown'
      ? current.markdownContent === initial.markdownContent
      : JSON.stringify(current.contentJson) === JSON.stringify(initial.contentJson);

  return (
    contentEqual &&
    current.slug === initial.slug &&
    current.title === initial.title &&
    current.locale === initial.locale &&
    current.excerpt === initial.excerpt &&
    current.description === initial.description &&
    current.categoryId === initial.categoryId &&
    current.icon === initial.icon
  );
}

/**
 * Owns all editable fields for the admin article form plus an `isDirty`
 * derived flag comparing the current values to the initial snapshot.
 */
export function useArticleFormState({
  contentFormat,
  defaultValues,
  defaultSlug,
  defaultLocale,
}: UseArticleFormStateArgs) {
  const [slug, setSlug] = useState(defaultValues?.slug ?? defaultSlug ?? '');
  const [title, setTitle] = useState(defaultValues?.title ?? '');
  const [contentJson, setContentJson] = useState<TiptapJsonContent | null>(
    defaultValues?.contentJson ?? null
  );
  const [markdownContent, setMarkdownContent] = useState(
    contentFormat === 'markdown' ? (defaultValues?.content ?? '') : ''
  );
  const [locale, setLocale] = useState(defaultValues?.locale ?? defaultLocale ?? 'en');
  const [excerpt, setExcerpt] = useState(defaultValues?.excerpt ?? '');
  const [description, setDescription] = useState(defaultValues?.description ?? '');
  const [categoryId, setCategoryId] = useState(defaultValues?.categoryId ?? '');
  const [icon, setIcon] = useState(defaultValues?.icon ?? '');

  const initial = useMemo<ArticleFormState>(
    () => ({
      slug: defaultValues?.slug ?? defaultSlug ?? '',
      title: defaultValues?.title ?? '',
      contentJson: defaultValues?.contentJson ?? null,
      markdownContent: contentFormat === 'markdown' ? (defaultValues?.content ?? '') : '',
      locale: defaultValues?.locale ?? defaultLocale ?? 'en',
      excerpt: defaultValues?.excerpt ?? '',
      description: defaultValues?.description ?? '',
      categoryId: defaultValues?.categoryId ?? '',
      icon: defaultValues?.icon ?? '',
    }),
    [defaultValues, defaultSlug, defaultLocale, contentFormat]
  );

  const current = useMemo<ArticleFormState>(
    () => ({
      slug,
      title,
      contentJson,
      markdownContent,
      locale,
      excerpt,
      description,
      categoryId,
      icon,
    }),
    [slug, title, contentJson, markdownContent, locale, excerpt, description, categoryId, icon]
  );

  const isDirty = useMemo(
    () => !shallowEqualArticleData(current, initial, contentFormat),
    [current, initial, contentFormat]
  );

  return {
    // values
    slug,
    title,
    contentJson,
    markdownContent,
    locale,
    excerpt,
    description,
    categoryId,
    icon,
    // setters
    setSlug,
    setTitle,
    setContentJson,
    setMarkdownContent,
    setLocale,
    setExcerpt,
    setDescription,
    setCategoryId,
    setIcon,
    // derived
    isDirty,
  };
}

export type { ArticleFormState };
