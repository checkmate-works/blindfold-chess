import { copyToTranslationRows } from '@/lib/ads/copy';
import type { CreativeCopy } from '@/lib/ads/copy';
import { PLACEHOLDER_AD_HREF } from '@/lib/ads/placeholder';
import type { AdSlot } from '@/lib/ads/registry';
import { AD_SLOT_VALUES, kindForSlot } from '@/lib/ads/registry';
import type { NativeCardThumbnail } from '@/lib/ads/thumbnail';
import { thumbnailToColumns } from '@/lib/ads/thumbnail';

import { adCreativeTranslations, adCreatives, db } from '../index';

// ---------------------------------------------------------------------------
// Initial data: ad creatives (DB is source of truth, insert once only)
// ---------------------------------------------------------------------------

/**
 * A creative as the seed writes it. The `id` is fixed rather than generated
 * because it is the only key this table has — `slot` is deliberately
 * non-unique, creatives rotate within a placement — and it is also the
 * sub-ID the affiliate network reports clicks under, so it has to be the
 * same in every environment the row lands in.
 */
type SeedCreative = {
  id: string;
  slot: AdSlot;
  href: string;
  isActive: boolean;
  sortOrder: number;
  icon?: string;
  thumbnail?: NativeCardThumbnail;
  copy: CreativeCopy;
};

/** The per-slot part of a placeholder; everything else is the same for all of them. */
type PlaceholderCreative = Pick<SeedCreative, 'id' | 'copy'> & Partial<Pick<SeedCreative, 'icon'>>;

/**
 * One inactive placeholder per slot, keyed by slot so the compiler requires
 * a new placement to bring one.
 *
 * A slot with no creative renders nothing, which is a correct runtime state
 * but a useless authoring one: `/admin/ads` lists the placements, and every
 * one of them opens on an empty list that says nothing about what belongs
 * there. A placeholder is a filled-in example of the slot's kind — roughly
 * the copy length that shape holds, the default board as the thumbnail — so
 * the admin edits a card rather than inventing one, and the authoring form's
 * live preview has something to draw from its first render.
 *
 * Every one carries {@link PLACEHOLDER_AD_HREF}, and both write paths that
 * can turn a creative on refuse a placeholder href (`setAdCreativeActive`,
 * and the admin validator behind the edit form's Active checkbox). So none of
 * these rows can reach a reader without someone first pasting a real
 * destination in: the `isActive: false` here is the default, not the only
 * thing standing in the way.
 *
 * No image on any of them. An uploaded image is stored against a creative id
 * that does not exist until the row does, so the seed could only reference a
 * file it has no way to ship; leaving the thumbnail columns at their defaults
 * renders the default board, which is the fallback every creative falls back
 * to anyway.
 *
 * Copy is `en` + `ja` only. Those are the two languages this project's
 * content is written in, and `es` / `pt-BR` fall back to `en` per field (see
 * `resolveNativeCopy`), so a placeholder in them would be four more strings
 * to discard unread.
 */
const PLACEHOLDER_CREATIVES = {
  'feed-native-ad': {
    id: '7deb899f-3fe1-4351-99e5-ca80af562e00',
    copy: {
      title: {
        en: '[Placeholder] Home feed / topics timeline card',
        ja: '【プレースホルダ】ホームフィード・トピックタイムラインのカード',
      },
      description: {
        en: 'Replace the link and this copy with a real creative. This card is read between timeline entries, so it should sound like something worth reading next rather than like an announcement.',
        ja: 'リンクと本文を実際のクリエイティブに差し替えてください。このカードはタイムラインの投稿の間で読まれるので、告知ではなく「次に読みたくなるもの」として書きます。',
      },
    },
  },
  'topic-catalog-native-ad': {
    id: '8c6f9334-a81b-44f3-8f95-09f248f95ee8',
    copy: {
      title: {
        en: '[Placeholder] Topic catalog card (/topics/squares, /topics/openings)',
        ja: '【プレースホルダ】トピック一覧のカード（/topics/squares・/topics/openings）',
      },
      description: {
        en: 'Replace the link and this copy with a real creative. The reader here is still choosing a square or an opening to read about, so a creative that helps them choose fits the moment.',
        ja: 'リンクと本文を実際のクリエイティブに差し替えてください。ここの読者はまだ「どのマス・どの定跡を読むか」を選んでいる段階なので、その選択を助ける内容が合います。',
      },
    },
  },
  'topic-detail-native-ad': {
    id: '0e3fd1dc-2b36-43ea-a1dd-66e4125c089f',
    copy: {
      title: {
        en: '[Placeholder] Topic discussion card (an opening or a square page)',
        ja: '【プレースホルダ】トピック詳細のカード（定跡・マスのページ）',
      },
      description: {
        en: 'Replace the link and this copy with a real creative. The reader has already picked a subject and is reading other people’s posts about it, so this card sits among opinions and has to read like one worth having.',
        ja: 'リンクと本文を実際のクリエイティブに差し替えてください。読者はすでに対象を決めて他の人の投稿を読んでいる状態なので、意見の並びの中に置いて読むに足る内容にします。',
      },
    },
  },
  'chunk-list-native-ad': {
    id: '0b16ebdb-7f28-4606-bab5-9e6e0f54d1cd',
    copy: {
      title: {
        en: '[Placeholder] Chunk catalog card',
        ja: '【プレースホルダ】チャンク一覧のカード',
      },
      description: {
        en: 'Replace the link and this copy with a real creative. The reader is browsing piece-coordination patterns to memorise, twenty to a page, so a creative about learning or retention belongs here more than one about playing.',
        ja: 'リンクと本文を実際のクリエイティブに差し替えてください。読者は「次に覚える駒の配置パターン」を1ページ20件で見ている状態なので、対局そのものより学習・記憶に寄せた内容が合います。',
      },
    },
  },
  'glossary-term-list-native-ad': {
    id: '47da2a50-feb2-467d-a5a6-59a0ddebed7d',
    copy: {
      title: {
        en: '[Placeholder] Glossary term list card (a letter or a category page)',
        ja: '【プレースホルダ】用語集一覧のカード（頭文字・カテゴリのページ）',
      },
      description: {
        en: 'Replace the link and this copy with a real creative. These pages are prerendered and largely reached from search, so the reader is often new to the term they looked up — and to this site.',
        ja: 'リンクと本文を実際のクリエイティブに差し替えてください。このページは事前生成されて検索から来ることが多く、読者は調べた用語にも、このサイトにも不慣れなことが多い前提で書きます。',
      },
    },
  },
  'puzzle-result-native-ad': {
    id: 'e247fb01-fc71-497a-9787-cc99ab5330af',
    copy: {
      title: {
        en: '[Placeholder] Next-puzzles thumb',
        ja: '【プレースホルダ】次のパズルのサムネイル',
      },
      // Stored because the `en` row must carry both fields, and never drawn:
      // the thumb tile is a thumbnail and one line of title. Kept short so
      // nobody mistakes it for copy that reaches a reader.
      description: {
        en: 'Not rendered on this surface. Replace the link, the title and the thumbnail image.',
        ja: 'この面では描画されません。リンク・タイトル・サムネイル画像を差し替えてください。',
      },
    },
  },
  'puzzle-detail-native-ad': {
    id: '6d11adb1-b5b0-487e-a609-d07788e917f4',
    copy: {
      title: {
        en: '[Placeholder] Other-puzzles thumb',
        ja: '【プレースホルダ】他のパズルのサムネイル',
      },
      // Stored because the `en` row must carry both fields, and never drawn.
      description: {
        en: 'Not rendered on this surface. Replace the link, the title and the thumbnail image.',
        ja: 'この面では描画されません。リンク・タイトル・サムネイル画像を差し替えてください。',
      },
    },
  },
  'position-memory-result-native-ad': {
    id: 'ae34e6a7-2a63-4013-8ff4-dd31921d1e26',
    copy: {
      title: {
        en: '[Placeholder] Next-problems thumb (position memory)',
        ja: '【プレースホルダ】次の問題のサムネイル（局面記憶）',
      },
      description: {
        en: 'Not rendered on this surface. Replace the link, the title and the thumbnail image.',
        ja: 'この面では描画されません。リンク・タイトル・サムネイル画像を差し替えてください。',
      },
    },
  },
  'position-memory-detail-native-ad': {
    id: '2208deef-6156-4162-8448-55b982081ddf',
    copy: {
      title: {
        en: '[Placeholder] Other-problems thumb (position memory)',
        ja: '【プレースホルダ】他の問題のサムネイル（局面記憶）',
      },
      description: {
        en: 'Not rendered on this surface. Replace the link, the title and the thumbnail image.',
        ja: 'この面では描画されません。リンク・タイトル・サムネイル画像を差し替えてください。',
      },
    },
  },
  'leaderboard-top-native-ad': {
    id: '6ffaca71-aa1e-4741-aa7c-1e144d2a133e',
    // Sits in the 40px badge the module tiles put their leaderboard icon in.
    icon: '🏅',
    copy: {
      title: {
        en: '[Placeholder] Leaderboard grid tile',
        ja: '【プレースホルダ】リーダーボード一覧のタイル',
      },
      description: {
        en: 'Replace the link and this copy. Keep the description to one line — the neighbouring tiles put the reader\u2019s own rank there, and this line truncates rather than wrapping.',
        ja: 'リンクと本文を差し替えてください。説明は1行に収めます。隣のタイルはそこに読者自身の順位を出しており、この行は折り返さず省略されます。',
      },
    },
  },
  'practice-result-native-ad': {
    id: 'afccd388-6b89-402e-8a81-3d58c909afe6',
    // Required by the tile kind's row constraint, and drawn at 2xl on the
    // left of the card — the same position a `CardLink`'s emoji occupies.
    icon: '📖',
    copy: {
      title: {
        en: '[Placeholder] Practice result card',
        ja: '【プレースホルダ】練習リザルトのカード',
      },
      description: {
        en: 'Replace the link and this copy with a real creative. The reader has just finished a drill and is looking at their score, on any of the practice modules — so write for someone measuring their own progress, not for someone browsing.',
        ja: 'リンクと本文を実際のクリエイティブに差し替えてください。読者はいずれかの練習モジュールを1本終えてスコアを見ている状態です。回遊中の人ではなく、自分の上達を測っている人に向けて書きます。',
      },
    },
  },
  'practice-grid-native-ad': {
    id: '5b3f64e0-495c-47eb-8514-23e9c7e6de59',
    // The one `native_tile` slot, and the emoji is not optional there: a tile
    // without one is the only cell in the grid with no glyph, and
    // `ad_creatives_chk_fields_for_kind` rejects the row outright.
    icon: '📘',
    copy: {
      title: {
        en: '[Placeholder] Practice grid tile',
        ja: '【プレースホルダ】練習メニューのタイル',
      },
      description: {
        en: 'Replace the link and this copy with a real creative. Its neighbours are practice modules, so keep the title about as short as theirs — a tile that wraps to three lines is the one thing on the grid that looks pasted in.',
        ja: 'リンクと本文を実際のクリエイティブに差し替えてください。隣は練習モジュールのタイルなので、タイトルはその程度の長さに収めます。3 行に折り返すタイルはグリッドの中で明らかに浮きます。',
      },
    },
  },
  'puzzle-list-native-ad': {
    id: '88fd6b4c-f85d-49f6-b06d-4763f4b2c3d8',
    copy: {
      title: {
        en: '[Placeholder] Puzzle list card',
        ja: '【プレースホルダ】パズル一覧のカード',
      },
      description: {
        en: 'Replace the link and this copy with a real creative. The surrounding cards are user-submitted puzzles led by a board thumbnail, which is the shape this card blends into.',
        ja: 'リンクと本文を実際のクリエイティブに差し替えてください。周囲は盤面サムネイル付きのユーザー投稿パズルなので、その形に馴染ませます。',
      },
    },
  },
  'position-memory-list-native-ad': {
    id: 'a53fbc77-bed2-44f0-9320-a97a1660b8e7',
    copy: {
      title: {
        en: '[Placeholder] Position memory list card',
        ja: '【プレースホルダ】局面記憶一覧のカード',
      },
      description: {
        en: 'Replace the link and this copy with a real creative. Same list machinery as the puzzle list but a separate pool, so this one can speak to memorization rather than tactics.',
        ja: 'リンクと本文を実際のクリエイティブに差し替えてください。一覧の仕組みはパズルと同じですが、プールは別なので、戦術ではなく「覚える」側に寄せた内容にできます。',
      },
    },
  },
  'shared-game-list-native-ad': {
    id: 'b35bf68a-c87c-44d9-94e1-baa5c9a00bec',
    copy: {
      title: {
        en: '[Placeholder] Shared game list card',
        ja: '【プレースホルダ】公開対局一覧のカード',
      },
      description: {
        en: 'Replace the link and this copy with a real creative. The surrounding cards are games other players published, led by a board thumbnail, which is the shape this card blends into.',
        ja: 'リンクと本文を実際のクリエイティブに差し替えてください。周囲は他のプレイヤーが公開した対局のカード（盤面サムネイル付き）なので、その形に馴染ませます。',
      },
    },
  },
} satisfies Record<AdSlot, PlaceholderCreative>;

const seedCreatives: SeedCreative[] = AD_SLOT_VALUES.map((slot) => ({
  ...PLACEHOLDER_CREATIVES[slot],
  slot,
  href: PLACEHOLDER_AD_HREF,
  isActive: false,
  sortOrder: 0,
}));

/**
 * Insert-only. A creative the seed has already written is left exactly as the
 * admin has since edited it: the conflict target is the fixed `id`, so a
 * re-run writes nothing over a row that exists and only adds rows that are
 * new. Copy rows follow the same rule on `(creative_id, locale)`.
 *
 * That is what makes re-seeding safe once the placeholders have been filled
 * in: the row whose href and copy an admin replaced keeps both, and a slot
 * whose placeholder was never touched is left exactly as it was.
 */
export async function seedAds() {
  if (seedCreatives.length === 0) return;

  console.log('Seeding ad creatives...');

  for (const creative of seedCreatives) {
    const kind = kindForSlot(creative.slot);
    await db
      .insert(adCreatives)
      .values({
        id: creative.id,
        kind,
        slot: creative.slot,
        href: creative.href,
        isActive: creative.isActive,
        sortOrder: creative.sortOrder,
        icon: kind === 'native_tile' ? (creative.icon ?? null) : null,
        avatarImagePath: null,
        avatarAlt: null,
        // No thumbnail leaves the columns to their defaults: the default board.
        ...(creative.thumbnail ? thumbnailToColumns(creative.thumbnail) : {}),
      })
      .onConflictDoNothing({ target: adCreatives.id });

    const copyRows = copyToTranslationRows(creative.id, creative.copy);
    if (copyRows.length > 0) {
      await db
        .insert(adCreativeTranslations)
        .values(copyRows)
        .onConflictDoNothing({
          target: [adCreativeTranslations.creativeId, adCreativeTranslations.locale],
        });
    }
  }
}
