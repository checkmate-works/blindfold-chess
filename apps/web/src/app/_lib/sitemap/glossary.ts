import type { MetadataRoute } from 'next';

import { SUPPORTED_LOCALES } from '@/config';

import { getCategoryCounts, getUniqueLetters } from '@/app/[locale]/(public)/glossary/_lib/queries';

import { BASE_URL, generateAlternates } from './shared';

export async function buildGlossaryEntries(now: Date): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  const glossaryLetters = await getUniqueLetters();
  const categoryCounts = await getCategoryCounts();
  const glossaryCategories = Object.keys(categoryCounts);

  for (const locale of SUPPORTED_LOCALES) {
    // Glossary letter pages
    for (const letter of glossaryLetters) {
      const path = `/glossary/letter/${letter.toLowerCase()}`;
      entries.push({
        url: `${BASE_URL}/${locale}${path}`,
        lastModified: now,
        alternates: generateAlternates(path),
      });
    }

    // Glossary category pages
    for (const category of glossaryCategories) {
      const path = `/glossary/category/${category}`;
      entries.push({
        url: `${BASE_URL}/${locale}${path}`,
        lastModified: now,
        alternates: generateAlternates(path),
      });
    }
  }

  return entries;
}
