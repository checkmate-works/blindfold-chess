import type { ChessTerm } from '@/app/[locale]/(public)/glossary/_lib/types';

export const termsAC: ChessTerm[] = [
  {
    term: 'Assumption',
    termJa: '思い込み',
    definition: '思い込みのこと。対局中に根拠なく状況を判断してしまうこと',
    definitionEn:
      'A preconceived notion. Making judgments about a position without proper justification during a game',
    category: 'general',
  },
  {
    term: 'Attraction',
    termJa: 'アトラクション',
    definition:
      '相手の駒を特定のマスに引き寄せる手筋。キングや重要な駒を不利なマスへ誘導し、その後の攻撃を決めることを目的とする戦術。Decoyとほぼ同義',
    definitionEn:
      "A tactic that lures an opponent's piece to a specific square. The strategy aims to guide the king or important pieces to disadvantageous squares to set up subsequent attacks. Nearly synonymous with Decoy",
    aliases: ['Decoy'],
    category: 'tactics',
    isTheme: true,
  },
  {
    term: 'Backward Pawn',
    termJa: 'バックワードポーン',
    definition:
      '隣のポーンに取り残され、他のポーンの支えが得ることができなくなったポーンのこと。近隣に前進させてプロテクトに充てるポーンがないため、支えがなく孤立しやすい。相手にそのポーンの前方のマス（アウトポスト）を利用されやすい。ルークやビショップなどの長距離駒に狙われやすい。特にオープンファイルやセミオープンファイル上にあると弱点になりやすい。守りが難しく、ポジション上の長期的な弱点になることが多い',
    definitionEn:
      'A pawn that has been left behind by neighboring pawns and cannot obtain support from other pawns. Without nearby pawns to advance and protect it, it becomes isolated and vulnerable. The square in front of it can be used as an outpost by the opponent. It is susceptible to attacks from long-range pieces like rooks and bishops. It becomes particularly weak when on open or semi-open files. Difficult to defend, it often becomes a long-term positional weakness',
    category: 'structure',
    isTheme: true,
  },
  {
    term: 'Battery',
    termJa: 'バッテリー',
    definition:
      '2つ以上の駒を一直線（縦、横、斜め）に並べて、同じ方向に攻撃の圧力をかける配置のこと。代表的な例として、ルーク+クイーン、ビショップ+クイーン、ルーク+ルークなどがある',
    definitionEn:
      'A configuration where two or more pieces are aligned in a straight line (vertical, horizontal, or diagonal) to apply attacking pressure in the same direction. Common examples include rook+queen, bishop+queen, and rook+rook combinations',
    category: 'tactics',
  },
  {
    term: 'Blockaded Pawn',
    termJa: 'ブロケードポーン',
    definition:
      '駒によって前進を妨害されたポーン。ブロックに用いる駒はナイトが最適とされ、クイーンやルークは一般的にはブロックに適さないとされる。単なるブロック（blocked）ではなく、動かせない状態にされ、戦略的に損をしていることを意味する',
    definitionEn:
      'A pawn whose advance is obstructed by a piece. Knights are considered the ideal blockers, while queens and rooks are generally unsuitable for blocking. This refers not just to being blocked, but to being immobilized in a strategically disadvantageous way',
    positions: [
      {
        fen: '3K4/8/1p6/2p2P2/5n2/8/8/1k6 w - - 0 1',
        sortOrder: 0,
      },
    ],
    category: 'structure',
    isTheme: true,
  },
  {
    term: 'Calculation',
    termJa: '読み',
    definition:
      '自分や相手の指し手を何手先まで正確に予測し、局面の変化を見通す能力。駒の動きや駒交換を計算して、有利な局面に持ち込むために使う。単なる直感や戦略とは異なり、具体的な手順を一つひとつ考え、評価するプロセス',
    definitionEn:
      'The ability to accurately predict moves several turns ahead and foresee changes in the position. Used to calculate piece movements and exchanges to achieve favorable positions. Unlike mere intuition or strategy, it is the process of considering and evaluating specific sequences move by move',
    category: 'general',
  },
  {
    term: 'Candidate Moves',
    termJa: '候補手',
    definition:
      'ソ連のGM Alexander Kotovが著書「Think Like a Grandmaster」で提唱した術語で、指し手として考えられる複数の選択肢のこと。局面を分析して考えられる候補手をいくつか選び、その候補手を一つずつ深く読み、数手先まで展開を計算し、最善と思われる指し手を選ぶプロセスを指す',
    definitionEn:
      'A term coined by Soviet GM Alexander Kotov in his book "Think Like a Grandmaster," referring to multiple possible moves to consider. It describes the process of analyzing a position to select several candidate moves, deeply examining each one, calculating several moves ahead, and choosing the apparently best move',
    category: 'general',
  },
  {
    term: 'Chessmen',
    termJa: 'チェスメン',
    definition:
      'チェス盤上に置かれているチェスの駒全体を指す総称。個々の駒ではなく、複数の駒のまとまりとして使われることが多い',
    definitionEn:
      'A collective term referring to all chess pieces on the board. Often used to refer to multiple pieces as a group rather than individual pieces',
    category: 'general',
  },
  {
    term: 'Clearance',
    termJa: 'クリアランス',
    definition:
      'ある駒を移動させることで、その背後にある駒やマスを活用できるようにする戦術のこと。チェックメイトや強力な戦術を成立させるために使われる。しばしば犠牲（サクリファイス）を伴うことがある',
    definitionEn:
      'A tactic involving moving a piece to make use of the piece or square behind it. Used to set up checkmates or powerful tactics. Often involves a sacrifice',
    category: 'tactics',
    isTheme: true,
  },
  {
    term: 'Closed Pawn',
    termJa: 'クローズドポーン',
    definition:
      '互いにポーン同士が向き合い、前進できなくなったファイルのポーン。Closed Positionの要因となる',
    definitionEn:
      'Pawns on a file where opposing pawns face each other and cannot advance. These contribute to creating a closed position',
    category: 'structure',
    isTheme: true,
  },
  {
    term: 'Closed Position',
    termJa: 'クローズドポジション',
    definition:
      'ポーンの構造が固定され、盤面が閉じた状態。ポーンブレイクや駒のマヌーバリング（再配置）が重要になり、通常のオープンポジションとは異なる戦略が求められる',
    definitionEn:
      'A position where the pawn structure is fixed and the board is closed. Pawn breaks and piece maneuvering (repositioning) become important, requiring different strategies than in open positions',
    category: 'strategy',
    isTheme: true,
  },
  {
    term: 'Color Complex',
    termJa: 'カラーコンプレックス',
    definition:
      '特定の色のマスのコントロールが弱くなった状態を意味する。ビショップを交換して弱い色を作ったり、ポーン構造によって特定の色が弱くなったりする',
    definitionEn:
      'A state where control over squares of a particular color becomes weak. This can occur after exchanging bishops or due to pawn structure that weakens specific colored squares',
    category: 'strategy',
    isTheme: true,
  },
  {
    term: 'Combination',
    termJa: 'コンビネーション',
    definition:
      '複数の手を組み合わせて駒を得たり、チェックメイトを狙ったりする連続的な指し手のこと。1手だけでなく、複数の手を繋げて相手を追い詰める計画的な指し手の流れ',
    definitionEn:
      'A sequence of moves combined to win material or achieve checkmate. Not just a single move, but a planned flow of multiple moves connected to corner the opponent',
    category: 'tactics',
  },
  {
    term: 'Compensation',
    termJa: 'コンペンセーション',
    definition:
      '駒損などのマテリアル的劣勢に対して、戦略的・戦術的な利点を得ている状態。開かれたライン、キングへの攻撃、開発のリード、スペースの優位、強力なポーン、敵のポーン構造の破壊などが補償となる',
    definitionEn:
      'A state of having strategic or tactical advantages to offset material disadvantages like piece deficits. Compensation can include open lines, attacks on the king, development lead, space advantage, strong pawns, or destruction of enemy pawn structure',
    category: 'strategy',
  },
  {
    term: 'Connection',
    termJa: 'コネクション',
    definition:
      '2つの駒が互いにサポートし合い、連携している状態。特にコネクテッドルークやコネクテッドポーンなどがよく使われる。単方向の防御関係はProtection（Defense）であり、Connectionとは異なる',
    definitionEn:
      'A state where two pieces mutually support and coordinate with each other. Commonly used for connected rooks or connected pawns. One-way defensive relationships are Protection (Defense), which differs from Connection',
    category: 'general',
  },
  {
    term: 'Continuation',
    termJa: '継続手',
    definition:
      '前の手に関連した流れを続ける手。ある構想・攻撃・防御・方針に基づいて、その流れを継続する手',
    definitionEn:
      'A move that continues the flow related to the previous move. A move that continues the flow based on a certain plan, attack, defense, or policy',
    category: 'general',
  },
  {
    term: 'Counterplay',
    termJa: 'カウンタープレイ',
    definition:
      '相手の攻めや計画に対して、自分が別の場所で反撃・対抗策を仕掛けること。劣勢でも、相手に考慮を迫るような脅威を作り出すことで、主導権を奪い返そうとするプレイ',
    definitionEn:
      "Creating counterattacks or countermeasures in a different area against the opponent's attack or plan. Play that attempts to regain the initiative by creating threats that force the opponent to consider, even when at a disadvantage",
    category: 'strategy',
  },
  {
    term: 'Critical Moment',
    termJa: 'クリティカルモーメント',
    definition:
      '正確な計算が必要な局面。この局面では唯一の勝ち筋があったり、チェックメイトを回避する手が1つだけ存在したりする。クリティカルモーメントを逃すと、形勢が逆転したり、勝てるはずの局面が引き分けになることがある',
    definitionEn:
      'A position requiring precise calculation. In such positions, there may be only one winning line or just one move to avoid checkmate. Missing a critical moment can reverse the evaluation or turn a winning position into a draw',
    category: 'general',
  },
];
