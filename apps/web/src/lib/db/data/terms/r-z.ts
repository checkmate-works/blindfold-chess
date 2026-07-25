import type { ChessTerm } from '@/app/[locale]/(public)/glossary/_lib/types';

export const termsRZ: ChessTerm[] = [
  {
    term: 'Rearspan',
    termJa: 'リアスパン',
    definition:
      'Hans Kmoch著Pawn Power in Chess（1956年）での定義によると、バックランクとポーンの距離のこと',
    definitionEn:
      "According to Hans Kmoch's definition in Pawn Power in Chess (1956), the distance between the back rank and a pawn",
    category: 'structure',
  },
  {
    term: 'Refutation',
    termJa: 'リフューテーション',
    definition:
      '相手の手が誤りであることを証明する一手や指し方。特に、相手の戦略やコンビネーションが成立しないことを示す強い応手を意味する。戦術的な悪手だけでなく、オープニングの新手が成立しないことを証明する手も含まれる',
    definitionEn:
      "A move or way of playing that proves the opponent's move is an error. Particularly refers to strong responses that show the opponent's strategy or combination doesn't work. Includes not only tactical mistakes but also moves that prove opening novelties are unsound",
    category: 'tactics',
  },
  {
    term: 'Restraining Move',
    termJa: '抑制手',
    definition: '相手の計画を未然に防ぐポジショナルな手（例：プロフィラクシス）',
    definitionEn:
      "A positional move that prevents the opponent's plans beforehand (e.g., prophylaxis)",
    category: 'strategy',
  },
  {
    term: 'Reversal of Moves',
    termJa: '手順逆',
    definition:
      '異なる手順で同じ局面に到達すること。例：1.d4 Nf6 2.c4 e6 3.Nf3 d5 = 1.d4 d5 2.Nf3 Nf6 3.c4 e6',
    definitionEn:
      'Reaching the same position through different move orders. Example: 1.d4 Nf6 2.c4 e6 3.Nf3 d5 = 1.d4 d5 2.Nf3 Nf6 3.c4 e6',
    category: 'opening',
  },
  {
    term: 'Reverse X',
    termJa: 'リバース',
    definition:
      'あるオープニングの構造を、色を逆転させて再現した形。例えば、Reverse Sicilianは白と黒の立場が逆転した形で、構造は同じ',
    definitionEn:
      "A structure that reproduces an opening with colors reversed. For example, the Reverse Sicilian has White and Black's roles reversed while maintaining the same structure",
    category: 'opening',
  },
  {
    term: 'Shattered Pawns',
    termJa: 'シャッタードポーン',
    definition:
      'ポーン構造が粉々に崩れている状態を表す言い回し。特に、ダブルポーン、アイソレーテッドポーン、トリプルポーンなどが混在していて、まとまりがなく、守りにくい形を指す',
    definitionEn:
      'An expression describing a pawn structure that has been broken into pieces. Particularly refers to formations with mixed doubled pawns, isolated pawns, and tripled pawns that lack cohesion and are difficult to defend',
    positions: [
      {
        fen: '3r2k1/R5bp/5p1p/8/8/5B1P/5PP1/6K1 w - - 0 1',
        sortOrder: 0,
      },
    ],
    category: 'structure',
    isTheme: true,
  },
  {
    term: 'Setup',
    termJa: 'セットアップ',
    definition:
      '特定の目的のために駒を配置すること。Positionが盤上の駒の配置そのもの（静的）であるのに対し、セットアップは目的に向けた駒の配置、準備のプロセス（動的）',
    definitionEn:
      'Arranging pieces for a specific purpose. While Position refers to the piece arrangement itself (static), Setup is the process of arranging pieces and preparing for a goal (dynamic)',
    category: 'general',
  },
  {
    term: 'Steamroller',
    termJa: 'スチームローラー',
    definition:
      '連結しているパスポーンのこと。パスポーンを連動して前進させると防御側は封鎖が非常に難しく、攻める側は有利になることが多い',
    definitionEn:
      "Connected passed pawns. When passed pawns advance in coordination, it's very difficult for the defender to blockade them, often giving the attacker an advantage",
    category: 'endgame',
    isTheme: true,
  },
  {
    term: 'Strategy',
    termJa: 'ストラテジー',
    definition:
      '長期的なゲームプラン（戦略）を指す。ポーン構造、キングの安全性、駒の配置、オープンファイルの支配など、ゲーム全体の計画を立てること。戦術（Tactics）よりも大きな視点での指し方を意味する',
    definitionEn:
      'Refers to long-term game planning (strategy). Planning the entire game including pawn structure, king safety, piece placement, and control of open files. Means playing with a broader perspective than tactics',
    category: 'strategy',
  },
  {
    term: 'Tabiya',
    termJa: 'タビヤ',
    reading: 'タビヤ',
    definition:
      'アラビア語由来の言葉で、配置、陣形、布陣という意味。序盤で定跡通りに手を進めた結果、頻繁に現れる典型的な局面のこと。そこからプレイヤーが独自の計画を考え始める分岐点となる局面',
    definitionEn:
      'An Arabic-derived word meaning arrangement, formation, or deployment. A typical position that frequently appears after following book moves in the opening. A branching point where players begin to devise their own plans',
    aliases: ['Tabia'],
    category: 'opening',
  },
  {
    term: 'Tactics',
    termJa: 'タクティクス',
    definition: '短期的な駒の取り合いやコンビネーションのこと',
    definitionEn: 'Short-term piece exchanges and combinations',
    category: 'tactics',
  },
  {
    term: 'Tarrasch Rule',
    termJa: 'タラッシュルール',
    definition:
      'チェスのエンドゲームに関する原則の一つ。パスポーンに対して、攻守両方のルークをポーンの後ろに配置すべきという法則。攻撃側はポーンの前進を後方から支援でき、防御側はポーンとの距離を最大限確保して攻撃の自由度を高められる',
    definitionEn:
      "One of the endgame principles in chess. The rule states that both sides should place their rooks behind a passed pawn. The attacking side supports the pawn's advance from behind, while the defending side maximizes the distance from the pawn to maintain attacking freedom",
    category: 'endgame',
    isTheme: true,
  },
  {
    term: 'Tempo',
    termJa: 'テンポ',
    reading: 'てんぽ',
    definition:
      'テンポとは手番（自分が行う番、ターン）のこと。複数形はテンピ（tempi）という。テンポを得るとは、相手に受けの手を強いることで、自分の駒を有利な位置に進めることができる状態',
    definitionEn:
      "Tempo refers to the turn (one's turn to move). The plural form is tempi. Gaining a tempo means forcing the opponent to make defensive moves while advancing your pieces to favorable positions",
    category: 'general',
  },
  {
    term: 'Threat',
    termJa: 'スレット',
    definition:
      '次の手で相手の駒を取る、またはチェックメイトを狙うなどの脅威を与える手のこと。相手が対応しなければ、大きな損失や敗北に繋がる状況を作り出すこと',
    definitionEn:
      "A move that threatens to capture an opponent's piece or deliver checkmate on the next move. Creating a situation that would lead to significant loss or defeat if the opponent doesn't respond",
    category: 'tactics',
  },
  {
    term: 'Transposition',
    termJa: 'トランスポジション',
    definition:
      '指し手の順序を変えて、最終的に同じ局面に到達すること。例：イングリッシュ→クイーンズ・ギャンビット。広義ではReversal of movesを含む',
    definitionEn:
      "Changing the move order to ultimately reach the same position. Example: English Opening → Queen's Gambit. In a broad sense, includes Reversal of moves",
    category: 'opening',
  },
  {
    term: 'Two Weakness Principle',
    termJa: 'ツーウィークネスプリンシプル',
    definition:
      '相手の守備を突破するためには、1つの弱点では足りず、2つ目の弱点を作ることで、防御を引き裂いて勝利に導くという原則。相手は守備力を分散せざるを得なくなり、結果として片方の弱点が破られる',
    definitionEn:
      "The principle that to break through the opponent's defense, one weakness is not enough; creating a second weakness splits the defense and leads to victory. The opponent must divide defensive resources, resulting in one weakness being exploited",
    category: 'endgame',
    isTheme: true,
  },
  {
    term: 'Ugly',
    termJa: 'アグリー',
    definition:
      'ポジションが悪く、不格好な形になっている状態。ポーン構造が悪い、駒の配置が不自然、キングの安全性が低い、オープニングの原則に反する動きなどを指す',
    definitionEn:
      'A state where the position is bad and awkward. Refers to poor pawn structure, unnatural piece placement, low king safety, or moves that violate opening principles',
    category: 'general',
  },
  {
    term: 'Visualization',
    termJa: 'ビジュアライゼーション',
    definition:
      '盤面や局面を頭の中で正確に思い描く能力。読みや計算の基礎となるスキルで、盤を見ずに次の数手先をイメージする力。強いプレイヤーほど、数手先の局面を正確にイメージし、計算する力が高い',
    definitionEn:
      "The ability to accurately visualize the board and positions in one's mind. A fundamental skill for calculation, the ability to imagine several moves ahead without looking at the board. Stronger players have better ability to accurately visualize and calculate positions several moves ahead",
    category: 'general',
  },
  {
    term: 'Waiting Move',
    termJa: 'ウェイティングムーブ',
    definition:
      '状況を変えずに、ただ相手に手番を渡すための中立的な手。通常は、自分は何もせず、相手に決断やミスを強いる目的で指される',
    definitionEn:
      'A neutral move that simply passes the turn to the opponent without changing the situation. Usually played to do nothing while forcing the opponent to make decisions or mistakes',
    category: 'strategy',
  },
  {
    term: 'X-ray',
    termJa: 'エックスレイ',
    definition:
      'ある駒が、他の駒を通り越して攻撃・守備しているような状態を指す。まるでX線で透けて見ているかのように働く駒の位置関係から、この名がついている',
    definitionEn:
      'Refers to a state where a piece attacks or defends through another piece. Named for the positional relationship where pieces work as if seeing through with X-rays',
    category: 'tactics',
    isTheme: true,
  },
  {
    term: 'Zugzwang',
    termJa: 'ツークツワンク',
    reading: 'つーくつわんく',
    definition: '強制被動。手を指さなければならないが、指すことで状況が悪化する局面のこと',
    definitionEn:
      'Compulsion to move. A position where one must make a move but any move worsens the situation',
    category: 'endgame',
    isTheme: true,
  },
  {
    term: 'Zwischenzug',
    termJa: 'ツヴィッシェンツーク',
    reading: 'つヴィッシェンツーク',
    definition:
      'ドイツ語で「間に差し込む手」を意味する戦術用語。通常の指し手の流れを一時的に中断し、相手の計画を崩す意外な一手を指す。あえて別の一手を差し込むことで有利な展開を作る手筋',
    definitionEn:
      'A German tactical term meaning "in-between move." An unexpected move that temporarily interrupts the normal flow of moves to disrupt the opponent\'s plans. A technique that creates favorable developments by deliberately inserting a different move',
    aliases: ['Intermezzo'],
    category: 'tactics',
    isTheme: true,
  },
];
