import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { SUPPORTED_LOCALES } from '@/config';

import { Divider, PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { OpeningCard } from './_components';
import { getOpenings } from './_lib/queries';

type Props = {
  params: Promise<{ locale: Locale }>;
};

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.topicsOpenings' });

  return {
    ...generateCanonicalMetadata({ locale, path: 'topics/openings' }),
    title: t('title'),
    description: t('description'),
  };
}

/** Section label for each first-move group */
const GROUP_LABELS: Record<string, string> = {
  e4: '1. e4',
  d4: '1. d4',
  c4: '1. c4',
  f3: '1. Nf3',
  f4: '1. f4',
  b3: '1. b3',
  g3: '1. g3',
  b4: '1. b4',
  g4: '1. g4',
};

export default async function OpeningsPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'topics' });
  const nameT = await getTranslations({ locale, namespace: 'topics.openings.names' });
  const openings = await getOpenings();

  // Group by firstMoveSquare preserving sort order
  const groups = new Map<string, typeof openings>();
  for (const opening of openings) {
    const key = opening.firstMoveSquare;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(opening);
  }

  const getDisplayName = (slug: string, fallback: string) => {
    const translated = nameT(slug as never);
    // next-intl returns the key path when translation is missing
    return translated === `topics.openings.names.${slug}` ? fallback : translated;
  };

  return (
    <div className="space-y-8">
      <PageTitle>{t('openings.title')}</PageTitle>

      <PagePanel>
        <p className="text-muted-foreground text-sm">{t('openings.description')}</p>

        {Array.from(groups.entries()).map(([square, groupOpenings]) => (
          <section key={square} className="space-y-3">
            <SectionTitle>
              {t('openings.sectionTitle', { move: GROUP_LABELS[square] ?? `1. ?${square}` })}
            </SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {groupOpenings.map((opening) => (
                <OpeningCard
                  key={opening.id}
                  opening={opening}
                  displayName={getDisplayName(opening.slug, opening.name)}
                  locale={locale}
                />
              ))}
            </div>
          </section>
        ))}

        <Divider />

        <Breadcrumb
          items={[{ label: t('title'), href: '/topics' }, { label: t('openings.title') }]}
          locale={locale}
        />
      </PagePanel>
    </div>
  );
}
