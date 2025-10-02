import { getTranslations } from 'next-intl/server';
import { PageTitle, Breadcrumb, CardLink, Divider, SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '../_lib/types';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export default async function PracticePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  const practices = [
    {
      id: 'algebraic-notation',
      title: t('practice.algebraicNotation.title'),
      description: t('practice.algebraicNotation.description'),
      icon: '📝',
    },
    {
      id: 'square-colors',
      title: t('practice.squareColors.title'),
      description: t('practice.squareColors.description'),
      icon: '🎨',
    },
    {
      id: 'position-memory',
      title: t('practice.positionMemory.title'),
      description: t('practice.positionMemory.description'),
      icon: '🧠',
    },
    {
      id: 'legal-moves',
      title: t('practice.legalMoves.title'),
      description: t('practice.legalMoves.description'),
      icon: '♟️',
    },
    {
      id: 'coordinate-quiz',
      title: t('practice.coordinateQuiz.title'),
      description: t('practice.coordinateQuiz.description'),
      icon: '🎯',
    },
  ];

  return (
    <div className="space-y-8">
      <PageTitle>{t('practice.title')}</PageTitle>
      <p className="text-muted-foreground">{t('practice.description')}</p>

      <Divider />

      <SectionTitle>{t('practice.modulesTitle')}</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {practices.map((practice) => (
          <CardLink
            key={practice.id}
            href={`/practice/${practice.id}`}
            icon={practice.icon}
            title={practice.title}
            description={practice.description}
            locale={locale}
          />
        ))}
      </div>

      <Divider />

      <Breadcrumb items={[{ label: t('navigation.practice') }]} locale={locale} />
    </div>
  );
}
