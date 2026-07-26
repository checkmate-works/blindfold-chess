# SNS 共有機能 — 全体設計と実装順序

公開対局（`/games/shared/[id]`）を X・note・Discord などへ効果的に共有できるようにする。
chess.com / lichess 相当の「盤面カード・GIF アニメ・埋め込み」を段階的に実装する。

## フェーズ構成と依存関係

| フェーズ | 仕様書                                           | 内容                                                       | 優先度 |
| -------- | ------------------------------------------------ | ---------------------------------------------------------- | ------ |
| Phase 1  | [SPEC1-og-image.md](./SPEC1-og-image.md)         | 対局ごとの動的 OG 画像（最終局面カード）+ description 生成 | 最優先 |
| Phase 2  | [SPEC2-gif-export.md](./SPEC2-gif-export.md)     | 棋譜再生 GIF の生成・ダウンロード + 共有メニュー UI        | 中     |
| Phase 3  | [SPEC3-embed-oembed.md](./SPEC3-embed-oembed.md) | iframe 埋め込みページ + oEmbed                             | 低     |

**Phase 1 が最初である理由**: 配信先カバー率が最大（X / note / Discord / LINE / はてブ すべてに効く）。
note は埋め込み許可サービスのallowlist方式なので任意 iframe は貼れず、OG リンクカードだけが効く。
X は og:image に GIF を渡しても1フレーム目の静止画しか出さないため、GIF は「ダウンロードして手動添付」
（lichess と同じ導線）にしかならない。よって OG 画像 > GIF > embed の順。

**共有部品**: Phase 1 で作る `renderBoardSvg`（FEN → 生 SVG 文字列の純関数）が Phase 2 の GIF フレーム
生成にもそのまま使われる。Phase 1 実装時に React 非依存・プラットフォーム非依存を必ず守ること。

## 現状の問題(Phase 1 の背景。実装前に把握必須)

1. **対局ページに og:image がそもそも無い。**
   `apps/web/src/app/[locale]/(public)/games/shared/[id]/_lib/page-metadata.ts` の
   `buildSharedGameMetadata` が返す `openGraph`（url / title のみ）が、Next.js のメタデータ解決
   （トップレベルキー単位の浅いマージ）によりルートレイアウトの `openGraph`（logo.png の images を含む）
   を**丸ごと置換**しているため。
2. **twitter:image はロゴが継承されている。**
   `apps/web/src/app/[locale]/layout.tsx` の `twitter: { card: 'summary_large_image', images: ['/logo.png'] }`
   がページ側で上書きされず生きている。X は og:image より twitter:image を優先するので、
   `opengraph-image.tsx` を追加するだけでは X のカードはロゴのまま。`twitter-image.tsx` の併設が必須。

## リポジトリ横断の遵守事項（全フェーズ共通）

- **chess.js 分離ルール**: `chess.js` を直接 import しない。必ず `@blindfold-chess/features/chess-core`
  （または純粋サブパス `@blindfold-chess/features/chess-core/fen`）経由。ルート `CLAUDE.md` 参照。
- **i18n パリティ**: メッセージキーを追加したら `apps/web/src/messages/{en,ja,es,pt-BR}.json` の
  **4ファイルすべて**に追加する。`apps/web/src/messages/parity.test.ts` が差分で落ちる。
  `pnpm --filter web check:i18n` も実行。
- **検証コマンド**: `pnpm --filter web typecheck` / `pnpm --filter web lint` / `pnpm --filter web test:run`
- **コミットはユーザーの明示的な指示があるまで行わない。**
- 対局スナップショット（moves / result / engineConfig 等）は**イミュータブル**、ただし
  **title / description は著者が編集できる**（キャッシュ設計に影響。各 SPEC 参照）。

## 主要な既存部品の所在(調査済み。再調査不要)

| 部品                      | 場所                                                                                                                                                                                            |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 対局取得                  | `apps/web/src/lib/db/games-read.ts` — `getGameById(id): Promise<SharedGameDetail \| null>`（React `cache()` 済み。deleted / 非 public は null）                                                 |
| games スキーマ            | `apps/web/src/lib/db/schema/games.ts` — `moves: string[]`, `startingFen`, `setupPlies`, `playerColor`, `engineConfig`, `result`, `moveCount`, `cleanRate`, `playSettings`                       |
| 棋譜リプレイ              | `@blindfold-chess/features/chess-core` — `replayMoves(moves, startingFen?)` → `[{fen, lastMove?{from,to}}]`（初期局面含む）、`getFenAfterMoves`, `getStartingFen`                               |
| FEN→盤面(純粋)            | `@blindfold-chess/features/chess-core/fen`（chess.js 非依存）— `fenToBoardFlat(fen): string[]` 等                                                                                               |
| 駒 SVG データ             | `@blindfold-chess/icons/data` — `getPieceData(piece, color): PieceSvgData`（viewBox "0 0 45 45"、`SvgElement` ツリー）                                                                          |
| 盤テーマ hex              | `packages/ui/src/theme/colors.ts` — `boardThemeColors: Record<BoardTheme, {light, dark, lightText, darkText}>`（lichess: `#f0d9b5`/`#b58863` 等。export 経路は package.json の exports を確認） |
| 目隠し表示の解決          | `@blindfold-chess/features/board-display` — `resolvePieceDisplay(piece, settings): PieceDisplay`（absent/ghost/circle/piece）、`BlindfoldDisplaySettings`                                       |
| playSettings→表示設定     | `apps/web/src/lib/games/play-settings-thumbnail.ts` — `playSettingsToThumbnailDisplay(playSettings, playerColor)`                                                                               |
| 碁石スタイル(CSS)         | `apps/web/src/lib/games/go-stone-style.ts`（SVG 版は radialGradient で再現する）                                                                                                                |
| 既存サムネイル(参考実装)  | `apps/web/src/lib/positions/ui/BoardThumbnail.tsx`（React 版。描画ルールの正がここ）                                                                                                            |
| エンジンラベル            | `apps/web/src/lib/engines/format-label.ts` — `formatEngineConfigLabel(config, t)`（"Maia 1600" / "Level 5"）                                                                                    |
| メタデータ基盤            | `apps/web/src/app/[locale]/_lib/metadata.ts` — `generateCanonicalMetadata`, `resolveTitle`, `buildPageTitle`                                                                                    |
| UUID ガード               | `apps/web/src/lib/validations/uuid.ts` — `UUID_RE`                                                                                                                                              |
| Supabase 管理クライアント | `apps/web/src/lib/supabase/admin.ts` — `createAdminClient()`                                                                                                                                    |
| SITE_URL                  | `apps/web/src/config.ts`                                                                                                                                                                        |
| sharp                     | 導入済み（`apps/web` 依存 `^0.34.4`。アニメーション GIF 結合可）                                                                                                                                |

## 状況（更新すること）

- [x] Phase 1 (SPEC1) 実装 — branch `feat/social-sharing-og-image`, merged into `feat/social-sharing`
- [x] Phase 2 (SPEC2) 実装 — branch `feat/social-sharing-gif-export`, merged into `feat/social-sharing`
- [ ] Phase 3 (SPEC3) 実装
