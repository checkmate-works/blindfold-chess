import type { MetadataRoute } from 'next';

import { SUPPORTED_LOCALES } from '@/config';

import { INTERVIEW_QUESTION_KEYS } from '@/app/[locale]/_lib/interview';

import { BASE_URL, generateAlternates } from './shared';

export function buildInterviewEntries(now: Date): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const key of INTERVIEW_QUESTION_KEYS) {
    const path = `/interview/${key}`;
    for (const locale of SUPPORTED_LOCALES) {
      entries.push({
        url: `${BASE_URL}/${locale}${path}`,
        lastModified: now,
        alternates: generateAlternates(path),
      });
    }
  }

  return entries;
}
