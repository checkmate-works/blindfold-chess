/**
 * Diagonal Quiz (ダイアゴナルクイズ — `/practice/diagonal-quiz`)
 *
 * @description
 * 指定されたマス目が属するダイアゴナル（斜めライン）を答える練習モジュール。
 * マス座標（例: e4）が提示され、そのマスを通るダイアゴナルと
 * アンチダイアゴナルの端点ペアを回答する。
 *
 * @flow
 * - Tutorial: 初回アクセス時にチュートリアルへリダイレクト（スキップ可、localStorage で記憶）
 * - Setup: チュートリアル完了後、チャレンジ開始 or トレーニングモード切替を選択
 * - Challenge: 制限時間付きでスコアを記録し、リーダーボードに反映
 * - Training: 時間制限なしで自由に練習
 * - Result: 回答結果の表示（チャレンジモードではリーダーボードプレビュー付き）
 */
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { ADSENSE_SLOT_CONTENT_BOTTOM, IS_LOCAL_DEV } from '@/config';

import { Divider, PagePanel, PageTitle } from '@/app/[locale]/_components';
import { AdSenseGuard } from '@/app/[locale]/_components/AdSense/AdSenseGuard';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import { generateLocaleStaticParams } from '@/app/[locale]/_lib/static-params';
import type { Locale } from '@/app/[locale]/_lib/types';

import { DiagonalQuizPageContent } from './_components/DiagonalQuizPageContent';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export const generateStaticParams = generateLocaleStaticParams;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });

  const title = t('practice.diagonalQuiz.title');
  const description = t('practice.diagonalQuiz.description');

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/diagonal-quiz', title, description }),
    title: resolveTitle(title, locale),
    description,
  };
}

export default async function DiagonalQuizPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });

  return (
    <div className="space-y-8">
      <PageTitle>{t('practice.diagonalQuiz.title')}</PageTitle>

      <PagePanel>
        <DiagonalQuizPageContent locale={locale} />

        {(IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_BOTTOM) && (
          <AdSenseGuard slot="content-bottom" slotId={ADSENSE_SLOT_CONTENT_BOTTOM ?? ''} />
        )}

        <Divider />

        <Breadcrumb
          items={[
            { label: t('navigation.practice'), href: '/practice' },
            { label: t('practice.diagonalQuiz.title') },
          ]}
          locale={locale}
        />
      </PagePanel>
    </div>
  );
}
