# 既知の技術的負債

## `generateStaticParams` / `setRequestLocale` の欠落

`square-colors/page.tsx` と `coordinate-quiz/page.tsx` に `generateStaticParams` と `setRequestLocale` が存在しない。CLAUDE.md の規約（`[locale]` 配下のルートには必須）に反している。本番で "Page changed from static to dynamic at runtime" エラーが発生する可能性がある。

対象ファイル:

- `apps/web/src/app/[locale]/(public)/practice/square-colors/page.tsx`
- `apps/web/src/app/[locale]/(public)/practice/coordinate-quiz/page.tsx`

## レイアウトコンポーネントの不統一

- square-colors、diagonal-quiz は `PracticePanel` を使用
- coordinate-quiz は `PracticeLayout` を使用し、カードのスタイリングをインラインの `className` で記述（`rounded-2xl` vs `PracticePanel` の `rounded-xl`）

## 中間レイヤーコンポーネントの冗長化

`SquareColors.tsx` と `DiagonalQuiz.tsx` が Setup コンポーネントをそのまま返すだけの pass-through になっている。page.tsx から直接 Setup を呼ぶ形に簡素化する余地がある。

対象ファイル:

- `apps/web/src/app/[locale]/(public)/practice/square-colors/_components/SquareColors.tsx`
- `apps/web/src/app/[locale]/(public)/practice/diagonal-quiz/_components/DiagonalQuiz.tsx`

## `ResultsFilters.test.tsx` のテスト失敗

`apps/web/src/app/[locale]/(protected)/mypage/(confirmed)/challenges/results/_components/ResultsFilters.test.tsx` で8テスト中7テストが失敗している。原因は `GamePreferencesProvider` のラップ不足と `getDefaultKey` によるデフォルトキー付与への期待値不一致。
