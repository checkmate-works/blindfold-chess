import { getTranslations } from 'next-intl/server';
import { PageTitle, Breadcrumb } from '@/app/[locale]/_components';
import { Link } from '@/i18n/routing';

interface PracticePageProps {
  params: Promise<{
    locale: 'en' | 'ja';
  }>;
}

export default async function PracticePage({ params }: PracticePageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  const practices = [
    {
      id: 'algebraic-notation',
      title: t('practice.algebraicNotation.title'),
      description: t('practice.algebraicNotation.description'),
      icon: '📝',
      difficulty: t('practice.difficulty.beginner'),
    },
    {
      id: 'square-color',
      title: t('practice.squareColor.title'),
      description: t('practice.squareColor.description'),
      icon: '🎨',
      difficulty: t('practice.difficulty.beginner'),
    },
    {
      id: 'position-memory',
      title: t('practice.positionMemory.title'),
      description: t('practice.positionMemory.description'),
      icon: '🧠',
      difficulty: t('practice.difficulty.intermediate'),
    },
    {
      id: 'legal-moves',
      title: t('practice.legalMoves.title'),
      description: t('practice.legalMoves.description'),
      icon: '♟️',
      difficulty: t('practice.difficulty.beginner'),
    },
    {
      id: 'coordinate-quiz',
      title: t('practice.coordinateQuiz.title'),
      description: t('practice.coordinateQuiz.description'),
      icon: '🎯',
      difficulty: t('practice.difficulty.beginner'),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PageTitle>{t('practice.title')}</PageTitle>
      <p className="text-muted-foreground mb-8">{t('practice.description')}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {practices.map((practice) => (
          <Link key={practice.id} href={`/practice/${practice.id}`} className="block">
            <div className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <span className="text-4xl">{practice.icon}</span>
                <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-1 rounded">
                  {practice.difficulty}
                </span>
              </div>
              <h3 className="text-lg font-semibold mb-2">{practice.title}</h3>
              <p className="text-sm text-muted-foreground">{practice.description}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-8 pt-6 border-t border-border">
        <Breadcrumb items={[{ label: t('navigation.practice') }]} locale={locale} />
      </div>
    </div>
  );
}
