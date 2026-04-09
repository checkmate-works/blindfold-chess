'use client';

import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import { useSafeLocale as useLocale } from '@/i18n/use-safe-locale';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaPlay } from 'react-icons/fa';

import { CardLink, SectionTitle } from '@/app/[locale]/_components';

export function AlgebraicNotationSetup() {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('practice.algebraicNotation');

  const handleStart = () => {
    router.push(`/${locale}/practice/algebraic-notation/session#algebraic-notation-session`);
  };

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <p className="text-muted-foreground mb-6">{t('description')}</p>

        <Button
          onClick={handleStart}
          variant="primary"
          size="lg"
          icon={<FaPlay />}
          className="w-full"
        >
          {t('start')}
        </Button>
      </div>

      <div className="mt-8 space-y-3">
        <SectionTitle>{t('requiredKnowledge')}</SectionTitle>
        <CardLink
          href="/learn/notation/algebraic-notation"
          icon="🔤"
          title={t('viewArticle')}
          description={t('articleDescription')}
          locale={locale}
        />
      </div>
    </div>
  );
}
