import type { ChessTerm } from '@/app/[locale]/(public)/glossary/_lib/types';

/**
 * Coaching principles — the general rules an AI review can attach to a
 * critical moment. Every entry here is named by id in
 * `@/lib/ai-review/principles` (its `glossarySlug` is `slugifyTerm(term)`),
 * which is what lets a review link a moment to a glossary page: the review
 * stores the id, the page shows this definition in the reader's language.
 * `principles.test.ts` there holds the two lists to each other.
 *
 * Not themes: a principle is advice, not a feature of a position.
 */
export const termsPrinciples: ChessTerm[] = [
  {
    term: 'Develop before attacking',
    termJa: '攻める前に展開する',
    definition:
      'クイーンを繰り出したり攻撃を始める前に、マイナーピースを展開してキャスリングを済ませる',
    definitionEn:
      'Bring the minor pieces out and castle before the queen goes hunting or an attack starts',
    category: 'principle',
  },
  {
    term: 'King safety first',
    termJa: 'キングの安全が最優先',
    definition:
      '駒得や駒の活動を追う前にキングを安全にする。必要もなくキング前のポーンを動かさない',
    definitionEn:
      'Keep the king safe before chasing material or activity; do not loosen its pawn shelter without need',
    category: 'principle',
  },
  {
    term: 'Count attackers and defenders',
    termJa: '攻め駒と守り駒を数える',
    definition: '駒を取る前やマスの争奪の前に、攻撃している駒と守っている駒の数を数える',
    definitionEn: 'Before a capture or a fight for a square, count the attackers and the defenders',
    category: 'principle',
  },
  {
    term: "Check the opponent's threats",
    termJa: '相手の狙いを確認する',
    definition: '毎手、相手の直前の手が何を狙っているかを問う。まずチェックと駒取りから',
    definitionEn:
      "Before every move, ask what the opponent's last move threatens — checks and captures first",
    category: 'principle',
  },
  {
    term: "Don't grab poisoned material",
    termJa: '毒のある駒を取らない',
    definition: 'テンポを失う、キングが露出する、あとで利子付きで取り返される駒は取らない',
    definitionEn:
      'Do not take material that costs tempi, exposes the king, or is won back with interest',
    category: 'principle',
  },
  {
    term: 'Keep central control',
    termJa: '中央の支配を保つ',
    definition: '中央を争う。閉じた形を活かす計画がないのに、中央を手放したりロックしたりしない',
    definitionEn:
      'Fight for the center; do not release or lock it without a plan the closed structure serves',
    category: 'principle',
  },
  {
    term: "Don't move the same piece twice",
    termJa: '同じ駒を二度動かさない',
    definition: '序盤では、まだ初期位置の駒があるうちに同じ駒を二度動かさない',
    definitionEn: 'In the opening, do not move the same piece twice while others are still at home',
    category: 'principle',
  },
  {
    term: 'Improve the worst piece',
    termJa: '一番働いていない駒を改善する',
    definition: '強制手がないときは、手を指すための手ではなく、最も働いていない駒を改善する',
    definitionEn:
      'When nothing is forced, improve the least active piece instead of making a move for its own sake',
    category: 'principle',
  },
  {
    term: 'Mind the pawn structure',
    termJa: 'ポーン構造に気を配る',
    definition: 'ポーンの手は取り消せない。見返りなしに弱いマスや弱いポーンを作らない',
    definitionEn:
      'Pawn moves are permanent: do not create weak squares or weak pawns without getting something for them',
    category: 'principle',
  },
  {
    term: 'Keep pieces protected',
    termJa: '駒を守られた状態に保つ',
    definition: '守られていない駒は落ちる。駒を守り、ある手で駒が浮くことに気づく',
    definitionEn:
      'Loose pieces drop off — keep pieces defended, and notice when a move leaves one hanging',
    category: 'principle',
  },
  {
    term: 'Trade when ahead',
    termJa: '優勢なら交換する',
    definition: '駒得しているなら駒を交換して単純化する。劣勢なら駒を残して複雑化を狙う',
    definitionEn:
      'When ahead in material, trade pieces and simplify; when behind, keep pieces on and seek complications',
    category: 'principle',
  },
  {
    term: 'Activate the rooks',
    termJa: 'ルークを活用する',
    definition: 'ルークはオープンファイルと 7 段目へ。早めに連結する',
    definitionEn: 'Put rooks on open files and the seventh rank; connect them early',
    category: 'principle',
  },
  {
    term: 'Calculate forcing moves first',
    termJa: '強制手から読む',
    definition: '激しい局面では、双方のチェック・駒取り・脅しを何よりも先に読む',
    definitionEn:
      'In a sharp position, calculate checks, captures, and threats — for both sides — before anything else',
    category: 'principle',
  },
  {
    term: 'Convert patiently',
    termJa: '辛抱強く勝ち切る',
    definition: '勝勢の局面ではリスクを避ける。固めて、相手の反撃の芽を摘み、一歩ずつ勝ち切る',
    definitionEn:
      'In a winning position, avoid risk: consolidate, remove counterplay, and convert step by step',
    category: 'principle',
  },
  {
    term: 'Activate the king in the endgame',
    termJa: '終盤はキングを活用する',
    definition: 'クイーンが消えたらキングは戦力。中央とポーンの方へ向かわせる',
    definitionEn:
      'Once the queens are off, the king is a fighting piece — bring it toward the center and the pawns',
    category: 'principle',
  },
  {
    term: 'Recount after captures',
    termJa: '駒取りの後に数え直す',
    definition: '駒取り・ポーンの手・チェックのたびに、関係する駒の位置を確かめてから次を考える',
    definitionEn:
      'After every capture, pawn move, or check, re-verify where the affected pieces stand before thinking further',
    category: 'principle',
  },
  {
    term: 'Verify the piece before committing',
    termJa: '指す前に駒の位置を確かめる',
    definition: '手を送信する前に、動かす駒が本当にそのマスにいるか、進路が空いているかを確認する',
    definitionEn:
      'Before submitting a move, confirm the square the moving piece is really on and that its path is clear',
    category: 'principle',
  },
  {
    term: 'Checkpoint at structural changes',
    termJa: '構造が変わる瞬間にチェックポイントを置く',
    definition:
      'ピークや意識的な全体の数え直しは、駒取り・ポーンブレイク・キングの移動といった構造の変化で行う。毎手ではなく',
    definitionEn:
      'Spend a peek or a deliberate full recount at structural changes — captures, pawn breaks, king moves — not per move',
    category: 'principle',
  },
  {
    term: 'Track both kings',
    termJa: '両方のキング周りを追い続ける',
    definition: '両キング周辺のマスを常に頭に置く。目隠しの大ポカの多くはそこから始まる',
    definitionEn:
      'Keep the squares around both kings in mind at all times; most blindfold blunders start there',
    category: 'principle',
  },
  {
    term: 'Narrate the position periodically',
    termJa: '定期的に局面を唱える',
    definition: '数手ごとに全局面を駒ひとつずつ唱えて、薄れる前に頭の中の盤を更新する',
    definitionEn:
      'Every few moves, recite the full position piece by piece to refresh the mental board before it fades',
    category: 'principle',
  },
];
