import type { getTranslations } from 'next-intl/server';
import Image from 'next/image';

type Props = {
  t: Awaited<ReturnType<typeof getTranslations<'landing'>>>;
  siteName: string;
};

export function DashboardHero({ t, siteName }: Props) {
  return (
    <section className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-secondary via-background to-secondary">
      <div className="text-center w-full max-w-4xl mx-auto space-y-6">
        <div className="flex justify-center">
          <Image
            src="/logo.png"
            alt={`${siteName} Logo`}
            width={120}
            height={120}
            className="w-32 h-32 md:w-40 md:h-40 drop-shadow-2xl"
            priority
          />
        </div>
        <div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            {siteName}
          </h1>
          <h2 className="mt-2 text-lg sm:text-xl text-muted-foreground font-medium">
            {t('tagline')}
          </h2>
        </div>
      </div>
    </section>
  );
}
