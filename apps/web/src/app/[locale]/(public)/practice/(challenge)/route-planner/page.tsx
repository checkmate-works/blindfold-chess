/**
 * Route Planner (ルートプランナー — `/practice/route-planner`)
 *
 * @description
 * 指定された駒で開始マスから目標マスまでの経路を見つける練習モジュール。
 * 駒の動き方を理解し、最短経路を計算する力を鍛える。
 * ナイト・ビショップなど複数の駒種に対応。
 *
 * @flow
 * - Tutorial: 初回アクセス時にチュートリアルへリダイレクト（スキップ可、localStorage で記憶）
 * - Setup: 駒種を選択してトレーニング開始
 * - Training: 駒・開始マス・目標マスが提示され、中間経路を入力して回答
 * - Result: 正誤フィードバックと最短経路の表示、次の問題へ進行
 */
import { createPracticeTopPage } from '@/app/[locale]/(public)/practice/_lib/createPracticeTopPage';

import RoutePlanner from './_components/RoutePlanner';

export const dynamic = 'force-dynamic';

const { generateMetadata, Page } = createPracticeTopPage({
  i18nKey: 'routePlanner',
  canonicalPath: 'practice/route-planner',
  renderSetup: (locale) => <RoutePlanner locale={locale} />,
  renderArticles: () => null,
});

export { generateMetadata };
export default Page;
