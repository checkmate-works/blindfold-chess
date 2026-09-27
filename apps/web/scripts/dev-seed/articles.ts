import { inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { articles } from '../../src/lib/db/schema';

type SeedArticleVariant = {
  locale: 'en' | 'ja';
  title: string;
  /** Markdown. Starts with the title as an H1, which the detail page skips. */
  content: string;
};

type SeedArticle = {
  slug: string;
  pinned: boolean;
  variants: SeedArticleVariant[];
};

/**
 * Three published articles, each exercising something the article pages
 * render differently.
 *
 * - The first is pinned, so the index's pin icon and its pinned-first
 *   ordering have something to show.
 * - The last has no Japanese variant, so `/ja/articles/<slug>` falls back to
 *   the English row and shows the "not translated" notice.
 * - Each body is several sections long, so the native ad card below it sits
 *   where a reader reaches it after scrolling, as it does in production.
 *
 * Slugs carry a `seed-` prefix, like the seed usernames, so a re-run's delete
 * cannot reach an article written by hand in the local admin.
 */
const SEED_ARTICLES: SeedArticle[] = [
  {
    slug: 'seed-blindfold-visualization-basics',
    pinned: true,
    variants: [
      {
        locale: 'en',
        title: 'Blindfold visualization: where to start',
        content: `# Blindfold visualization: where to start

Playing without a board is less about memory than about keeping a picture you can query. This article walks through the three habits that make the picture stable.

## Name the square before you move

Before every move, say the destination square out loud. Naming forces you to place the piece on a coordinate rather than on a vague region of the board.

## Check the diagonals, not just the files

Files and ranks are easy to hold. Diagonals are where blindfold players lose pieces. After each move, trace both diagonals of every bishop and the queen.

## Review the position every five moves

Stop and list every piece with its square. It feels slow at first, and it is the fastest way to find out which part of the picture has drifted.

## Next steps

The coordinate quiz and the diagonal quiz train exactly these two habits. Ten minutes a day is enough to notice a difference within a week.`,
      },
      {
        locale: 'ja',
        title: '目隠しチェスの盤面イメージ：最初の一歩',
        content: `# 目隠しチェスの盤面イメージ：最初の一歩

盤を見ずに指すために必要なのは、暗記力よりも「問い合わせができる盤面イメージ」です。この記事では、イメージを安定させる3つの習慣を紹介します。

## 動かす前にマスの名前を言う

毎手、移動先のマスを声に出してから指しましょう。名前を付けることで、駒を「だいたいこのあたり」ではなく座標の上に置けるようになります。

## ファイルだけでなく斜めも確認する

縦と横は保ちやすい一方、斜めは目隠しで駒を失いやすいところです。1手ごとに、ビショップとクイーンの両方の斜めをなぞって確認しましょう。

## 5手ごとに盤面を振り返る

いったん止まって、すべての駒とそのマスを列挙します。最初は時間がかかりますが、イメージのどこがずれているかを見つける一番の近道です。

## 次のステップ

座標クイズと斜めクイズは、まさにこの2つの習慣を鍛える練習です。1日10分でも、1週間ほどで違いを感じられるはずです。`,
      },
    ],
  },
  {
    slug: 'seed-square-colors-in-one-week',
    pinned: false,
    variants: [
      {
        locale: 'en',
        title: 'Learning square colors in one week',
        content: `# Learning square colors in one week

Knowing whether a square is light or dark without looking is the first skill every blindfold player needs. Here is a one-week plan.

## Days 1–2: the rule

A square is dark when its file number and rank number are both odd or both even. a1 is file 1, rank 1, so it is dark.

## Days 3–5: anchors

Memorize a few anchor squares — the four centre squares, the corners — and answer everything else by counting from the nearest anchor.

## Days 6–7: speed

Drill the square colors module against the clock. The goal is an answer before you have finished reading the coordinate.`,
      },
      {
        locale: 'ja',
        title: '1週間でマスの色を覚える',
        content: `# 1週間でマスの色を覚える

見ずにマスの色（白か黒か）が分かることは、目隠しチェスで最初に必要になる技能です。ここでは1週間の練習プランを紹介します。

## 1〜2日目：規則を知る

ファイルの番号とランクの番号が、両方奇数か両方偶数ならそのマスは黒です。a1 はファイル1・ランク1なので黒になります。

## 3〜5日目：基準のマスを作る

中央の4マスや四隅など、いくつかの基準となるマスを覚え、それ以外は一番近い基準から数えて答えます。

## 6〜7日目：速さを上げる

マスの色の練習を時間を計って繰り返しましょう。座標を読み終える前に答えが出るのが目標です。`,
      },
    ],
  },
  {
    slug: 'seed-reading-algebraic-notation',
    pinned: false,
    variants: [
      {
        locale: 'en',
        title: 'Reading algebraic notation without a board',
        content: `# Reading algebraic notation without a board

Blindfold play is algebraic notation all the way down: every move you hear or read is a piece letter and a square.

## Piece letters

K, Q, R, B and N name the pieces; a pawn move has no letter at all. Nf3 is a knight to f3, e4 is a pawn to e4.

## Captures and checks

An x marks a capture and a + marks check. Bxf7+ is a bishop taking on f7 with check.

## Disambiguation

When two identical pieces could reach the same square, the notation adds the file or rank they came from: Nbd2, R1e1.

This article has no Japanese translation yet, which is what the seed uses it for.`,
      },
    ],
  },
];

/**
 * Reseeds the published articles (`/articles`, `/articles/[slug]`).
 *
 * Without this the index shows its empty state and there is no detail page
 * to open, so the article ad slot — which renders below the list and below
 * the body — cannot be looked at locally.
 *
 * Re-runnable: the previous seed rows are hard-deleted first, matched on the
 * seed slugs, then every locale variant is inserted as `published` with a
 * `published_at`, the pair `publiclyVisibleArticle` requires. Article images
 * cascade with the row; the seed has none.
 */
export async function reseedArticles(
  db: PostgresJsDatabase
): Promise<{ slug: string; locales: string[] }[]> {
  await db.delete(articles).where(
    inArray(
      articles.slug,
      SEED_ARTICLES.map((a) => a.slug)
    )
  );

  // Spaced backwards from now so the index's newest-first order is stable.
  const now = Date.now();
  const STEP_MS = 24 * 60 * 60 * 1000;

  const seeded: { slug: string; locales: string[] }[] = [];
  for (const [index, seed] of SEED_ARTICLES.entries()) {
    const publishedAt = new Date(now - index * STEP_MS);
    await db.insert(articles).values(
      seed.variants.map((variant) => ({
        slug: seed.slug,
        title: variant.title,
        content: variant.content,
        contentFormat: 'markdown',
        locale: variant.locale,
        status: 'published',
        pinnedAt: seed.pinned ? publishedAt : null,
        publishedAt,
      }))
    );
    seeded.push({ slug: seed.slug, locales: seed.variants.map((v) => v.locale) });
  }

  return seeded;
}
