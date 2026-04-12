/**
 * Diagonal Quiz (ダイアゴナルクイズ -- `/practice/diagonal-quiz`)
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
import { createPracticeTopPage } from '@/app/[locale]/(public)/practice/_lib/createPracticeTopPage';

import { DiagonalQuizPageContent } from './_components/DiagonalQuizPageContent';

export const dynamic = 'force-dynamic';

const { generateMetadata, Page } = createPracticeTopPage({
  i18nKey: 'diagonalQuiz',
  canonicalPath: 'practice/diagonal-quiz',
  renderSetup: (locale) => <DiagonalQuizPageContent locale={locale} />,
  renderArticles: () => null,
  leaderboard: {
    module: 'diagonal_quiz',
    defaultKey: 'default',
  },
});

export { generateMetadata };
export default Page;
