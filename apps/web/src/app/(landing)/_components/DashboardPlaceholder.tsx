import type { getTranslations } from 'next-intl/server';

type Props = {
  t: Awaited<ReturnType<typeof getTranslations<'landing'>>>;
};

export function DashboardPlaceholder({ t }: Props) {
  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">{t('dashboard.title')}</h1>
        <p className="text-muted-foreground text-lg">{t('dashboard.comingSoon')}</p>
      </div>
    </main>
  );
}
