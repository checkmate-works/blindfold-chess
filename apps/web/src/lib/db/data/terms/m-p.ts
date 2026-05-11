import type { ChessTerm } from '@/app/[locale]/(public)/glossary/_lib/types';

export const termsMP: ChessTerm[] = [
  {
    term: 'Maneuvering',
    termJa: 'マヌーバリング',
    definition:
      '駒の調整や駒の運びのこと。駒をすぐに攻撃せずに、最適な位置に配置するための複数の指し手。直接的な攻撃ではなく、駒を少しずつ良い位置に動かして局面を整える動き。短期的な戦術ではなく、長期的に局面を改善することが目的',
    definitionEn:
      'Piece adjustment or repositioning. Multiple moves to place pieces in optimal positions without immediate attacks. Moves that gradually improve piece positions to organize the position rather than direct attacks. The goal is long-term positional improvement rather than short-term tactics',
    category: 'strategy',
  },
  {
    term: 'Material',
    termJa: 'マテリアル',
    definition:
      '駒の総合的な価値や駒数を表す概念。単に駒ではなく、駒の数値的な価値（ポイントシステム）に重点がある。駒得、駒損といった意味で使われることが多い。ポーンもピースも含むがキングは含まれない',
    definitionEn:
      'A concept representing the overall value or count of pieces. Emphasizes the numerical value of pieces (point system) rather than just pieces themselves. Often used in the context of material advantage or deficit. Includes both pawns and pieces but excludes the king',
    category: 'general',
  },
  {
    term: 'Mate Threat',
    termJa: 'メイトスレット',
    definition:
      '将棋で言うところの「詰めろ」。次の一手でチェックメイトをかけられる状況。無視すると次の手でチェックメイトになる',
    definitionEn:
      'Similar to "tsumero" in shogi. A situation where checkmate can be delivered on the next move. If ignored, checkmate follows on the next turn',
    positions: [
      {
        fen: '4r2r/pb1p2p1/4ppk1/2pq3p/7P/BPQ1R1P1/P4P2/4R1K1 b - - 1 34',
        sortOrder: 0,
      },
    ],
    category: 'tactics',
    isTheme: true,
  },
  {
    term: 'Miniature Game',
    termJa: 'ミニチュアゲーム',
    definition:
      '短い手数で決着がついたゲームを指し、特に20手以内で終了するものが一般的にミニチュアと呼ばれる',
    definitionEn:
      'A game that ends in a short number of moves, typically those finishing within 20 moves are commonly called miniatures',
    category: 'general',
  },
  {
    term: 'Minority Attack',
    termJa: 'マイノリティアタック',
    definition:
      '自分の少数（マイノリティ）側のポーンを使って、相手の多数ポーンを攻撃し、弱点（特に後方ポーン）を作らせる戦略。クイーンズ・ギャンビット・ディクラインドやカロ・カンのような構造でよく登場する',
    definitionEn:
      "A strategy using your minority pawns to attack the opponent's pawn majority, creating weaknesses (especially backward pawns). Commonly appears in structures like the Queen's Gambit Declined or Caro-Kann",
    category: 'strategy',
    isTheme: true,
  },
  {
    term: 'Novelty',
    termJa: 'ノベルティ',
    definition: 'これまでに指されていない新しい指し手',
    definitionEn: 'A new move that has not been played before',
    category: 'opening',
  },
  {
    term: 'Opposition',
    termJa: 'オポジション',
    definition:
      '二つのキングが1マス挟んで向き合うこと。特にエンドゲームで重要な概念で、相手のキングを直接対面して押さえ込み、主導権を握る戦術。動かざるを得ないキングが不利になる',
    definitionEn:
      "Two kings facing each other with one square between them. A particularly important concept in endgames, a tactic to control the opponent's king by direct confrontation and seize the initiative. The king forced to move is at a disadvantage",
    positions: [
      {
        fen: '8/4k3/8/4K3/8/4P3/8/8 w - - 0 1',
        sortOrder: 0,
        caption: 'White has the opposition with a passed pawn on e2',
      },
    ],
    category: 'endgame',
    isTheme: true,
  },
  {
    term: 'Organization',
    termJa: 'オーガニゼーション',
    definition:
      '駒組みや陣形を作る行為のこと。盤全体の駒の配置やポジショニングを最適化することを指す',
    definitionEn:
      'The act of building piece formations or creating positions. Refers to optimizing piece placement and positioning across the entire board',
    category: 'strategy',
  },
  {
    term: 'Outpost',
    termJa: 'アウトポスト',
    definition:
      '敵のポーンによって攻撃されず、自分の駒を安定して据え置けるマス。特に中央〜敵陣寄りにあるときは、戦略的に非常に強力な拠点となる。騎士には前哨基地が必要だ（シュタイニッツ）',
    definitionEn:
      'A square where your piece can be stably placed without being attacked by enemy pawns. Particularly when located in the center or enemy territory, it becomes a strategically powerful stronghold. "A knight needs an outpost" (Steinitz)',
    category: 'strategy',
    isTheme: true,
  },
  {
    term: 'Overloading',
    termJa: 'オーバーローディング',
    reading: 'おーばーろーでぃんぐ',
    definition:
      '1つの駒に複数の守備や役割を担わせることで、最終的にどれかを守れなくする戦術。1つの駒に無理をさせて、その防御を突破するテクニック。過負荷',
    definitionEn:
      'A tactic of burdening one piece with multiple defensive duties or roles, ultimately making it unable to defend everything. A technique of overworking a piece to break through its defense. Overload',
    category: 'tactics',
    isTheme: true,
  },
  {
    term: 'Overlooking',
    termJa: 'オーバールッキング',
    definition:
      '自分や相手の指し手の中で重要な脅威やチャンスを見逃してしまうこと。blunder以外にも自分の攻撃チャンスや相手のスレットの見落としなど',
    definitionEn:
      "Missing important threats or opportunities in your own or opponent's moves. Besides blunders, this includes overlooking your own attacking chances or opponent's threats",
    category: 'general',
  },
  {
    term: 'Passer',
    termJa: 'パサー',
    definition:
      'Passed Pawn（パスポーン）の略称的な呼び方で、口語・実戦解説・英語圏の会話などで使われる俗称',
    definitionEn:
      'A colloquial abbreviation for Passed Pawn, commonly used in casual speech, game commentary, and English-speaking chess conversations',
    aliases: ['Passed Pawn'],
    category: 'structure',
    isTheme: true,
  },
  {
    term: 'Pawn Islands',
    termJa: 'ポーンアイランド',
    definition:
      '互いに接続していない（孤立している）ポーングループのこと。縦に隣接したポーンが途切れた結果、1つのまとまりとして存在する孤立したポーンの集団を島（アイランド）と呼ぶ。ポーンアイランドが多いほど、構造が脆弱になりやすい',
    definitionEn:
      'Groups of pawns that are not connected to each other (isolated). When vertically adjacent pawns are broken, the resulting isolated pawn groups are called islands. The more pawn islands, the more vulnerable the structure tends to be',
    category: 'structure',
    isTheme: true,
  },
  {
    term: 'Pawn Break',
    termJa: 'ポーンブレイク',
    definition:
      '自分のポーンを相手のポーンにぶつけて、ポーン構造の変化を狙うこと。ルークやビショップなどのピースのためにファイルやダイアゴナルを開くことや、中央の支配権を争うために用いられる',
    definitionEn:
      'A move where you advance your pawn to challenge an enemy pawn, aiming to change the pawn structure. Used to open files or diagonals for pieces like rooks and bishops, or to contest control of the center',
    category: 'structure',
    isTheme: true,
  },
  {
    term: 'Pawn Storm',
    termJa: 'ポーンストーム',
    definition:
      'ポーンを連続的に前進させて、相手のキングや駒に圧力をかける攻撃的な手法。キングサイドやクイーンサイドのどちらかでポーンをまとめて進め、相手の防御を崩す狙いがある',
    definitionEn:
      "An aggressive technique of advancing pawns continuously to pressure the opponent's king or pieces. The aim is to advance pawns together on either the kingside or queenside to break down the opponent's defense",
    category: 'strategy',
    isTheme: true,
  },
  {
    term: 'Piece up',
    termJa: 'ピースアップ',
    definition:
      '駒得している状態のこと。一般的にポーン以外の駒（ナイト、ビショップ、ルーク、クイーン）で相手より1つ多く持っている状況を指す。ポーンが多い場合は「pawn up」と表現する',
    definitionEn:
      'Being ahead in material. Generally refers to having one more piece (knight, bishop, rook, or queen) than the opponent. When ahead in pawns, it\'s expressed as "pawn up"',
    category: 'general',
  },
  {
    term: 'Piece Coordination',
    termJa: 'ピースコーディネーション',
    definition: '駒の協調性のこと。複数の駒が連携して相互に支え合う状態',
    definitionEn:
      'The harmony of pieces. A state where multiple pieces work together and support each other',
    category: 'strategy',
  },
  {
    term: 'Poisoned Pawn',
    termJa: 'ポイズンドポーン',
    definition: '見た目は取れそうなポーンだが、取ると相手の攻撃や罠にはまってしまうポーンのこと',
    definitionEn:
      "A pawn that appears capturable but leads to an opponent's attack or trap when taken",
    category: 'tactics',
    isTheme: true,
  },
  {
    term: 'Positional Play',
    termJa: 'ポジショナルプレイ',
    definition:
      '駒の配置や長期的なプランに基づいて有利な局面を築くプレイスタイル。一手一手の駒の動きよりも、全体的な駒の調和、ポーン構造、支配するマスを重視するプレイ',
    definitionEn:
      'A playing style that builds advantageous positions based on piece placement and long-term plans. Play that emphasizes overall piece harmony, pawn structure, and square control rather than individual piece moves',
    category: 'strategy',
  },
  {
    term: 'Position',
    termJa: 'ポジション',
    definition:
      '局面のこと。盤上の駒の配置や状態（キャスリング権やアンパッサン可能なマスを含む）。ゲームの進行状況や駒の配置から生じる戦略的な要素のこと',
    definitionEn:
      'The position. The arrangement and state of pieces on the board (including castling rights and en passant squares). Strategic elements arising from the game progress and piece placement',
    category: 'general',
  },
  {
    term: 'Post-mortem',
    termJa: 'ポストモーテム',
    definition:
      'ラテン語で「死後の検視」という意味で、対局後に局面を振り返り、双方が指した手を検討する時間を指す',
    definitionEn:
      'Latin for "after death examination," referring to the time after a game when both players review the position and analyze the moves played',
    category: 'general',
  },
  {
    term: 'Protection',
    termJa: 'プロテクション',
    definition:
      'ある駒が、他の駒やポーンによって守られている状態。駒同士が守り合うConnectionとは異なり、単方向の防御関係のことを意味する',
    definitionEn:
      'A state where a piece is defended by another piece or pawn. Unlike Connection where pieces defend each other, this refers to a one-way defensive relationship',
    category: 'general',
  },
  {
    term: 'Provocation',
    termJa: 'プロボケーション',
    definition:
      '挑発や誘導を意味する単語だが、チェスでは相手に特定の手を指させるよう誘い込む手のことを言う。ミスを引き出したり、相手のポジションを悪化させることを目的とする',
    definitionEn:
      "While the word means provocation or inducement, in chess it refers to moves that lure the opponent into playing specific moves. The purpose is to induce mistakes or worsen the opponent's position",
    category: 'tactics',
  },
  {
    term: 'Prophylaxis',
    termJa: 'プロフィラクシス',
    definition:
      '単なる防御ではなく、相手がこれからやりたいことを事前に察知し、それを阻止する手。ポジショナルプレイの要であり、トッププレイヤーが多用する高度な戦術のひとつ',
    definitionEn:
      'Not just defense, but moves that anticipate and prevent what the opponent wants to do. A key element of positional play and one of the advanced techniques frequently used by top players',
    category: 'strategy',
    isTheme: true,
  },
  {
    term: 'Punish',
    termJa: 'パニッシュ',
    definition:
      '相手の悪手や不正確な手を厳しく咎めること。相手のミスを見逃さず、適切な手を指して優位に立つこと',
    definitionEn:
      "Severely exploiting the opponent's bad or inaccurate moves. Not missing the opponent's mistakes and playing appropriate moves to gain an advantage",
    category: 'general',
  },
];
