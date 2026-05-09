import type { ChessTerm } from '@/app/[locale]/(public)/glossary/_lib/types';

export const termsDL: ChessTerm[] = [
  {
    term: 'Decoy',
    termJa: 'デコイ',
    definition:
      '相手の駒を意図的に不利なマス・危険なマスに誘導する戦術。誘い出した駒を利用して、次のタクティクス（フォーク、ピン、メイトなど）につなげることが目的',
    definitionEn:
      "A tactic that intentionally lures an opponent's piece to an unfavorable or dangerous square. The purpose is to use the lured piece to set up subsequent tactics (forks, pins, mate, etc.)",
    aliases: ['Attraction'],
    category: 'tactics',
    isTheme: true,
  },
  {
    term: 'Deflection',
    termJa: 'デフレクション',
    definition:
      '相手の駒を、特定の守備位置から引き離す戦術。Attraction（Decoy）は特定の場所に誘い込むことが、Deflectionは特定の場所から引き離すことが目的',
    definitionEn:
      "A tactic that draws an opponent's piece away from a specific defensive position. While Attraction (Decoy) aims to lure to a specific place, Deflection aims to draw away from a specific place",
    category: 'tactics',
    isTheme: true,
  },
  {
    term: 'Desperado',
    termJa: 'デスペラード',
    definition:
      'スペイン語で「ならず者」の意味。どうせ取られる駒が、相手に最大限のダメージを与えてから犠牲になる手筋を意味する。駒が逃げ場のない状況で、ただでは取られずに最後に何かを得ようとする動き',
    definitionEn:
      'Spanish for "desperado" or "outlaw." A tactic where a piece that will be captured anyway inflicts maximum damage before being taken. A move where a piece with no escape tries to gain something before being captured for free',
    category: 'tactics',
    isTheme: true,
  },
  {
    term: 'Disposal',
    termJa: 'ディスポーザル',
    definition: '駒の配置や使い方に関する概念。特に、駒を適切に配置し、活用する能力や選択肢',
    definitionEn:
      'A concept related to piece placement and usage. Specifically, the ability and options to properly position and utilize pieces',
    category: 'general',
  },
  {
    term: 'Domination',
    termJa: 'ドミネーション',
    definition:
      '相手の駒の動きを完全に制限・封じ込める戦術のこと。相手の駒が逃げ場を失い、最終的に捕まる状況や、駒の有効な働きができなくなる局面を作り出す手筋',
    definitionEn:
      "A tactic that completely restricts and contains the movement of opponent's pieces. A technique that creates situations where opponent's pieces lose escape squares and are eventually captured, or positions where pieces cannot function effectively",
    category: 'tactics',
    isTheme: true,
  },
  {
    term: 'Double-Edged Game',
    termJa: 'ダブルエッジゲーム',
    definition:
      '両刃の戦い、互いにリスクを伴う攻撃的なゲーム。どちらのプレイヤーも主導権を握れる可能性があるが、一方的に有利とは言えない緊張感のある局面を指す',
    definitionEn:
      'A double-edged battle, an aggressive game with risks for both sides. Refers to tense positions where either player could seize the initiative, but neither has a clear advantage',
    category: 'strategy',
  },
  {
    term: 'Flank',
    termJa: 'フランク',
    definition:
      '中央以外のこと。キングサイドまたはクイーンサイドを指す。英語の「flank」は本来「側面」「わき腹」を意味する言葉',
    definitionEn:
      'Areas outside the center. Refers to the kingside or queenside. The English word "flank" originally means "side" or "wing"',
    category: 'general',
  },
  {
    term: 'Forced Sequence',
    termJa: '強制手順',
    definition:
      'ある局面で一方の側が特定の手順を余儀なくされる連続的な展開。相手のチェックや直接的な脅威があるため、唯一の対応手しかない連続手順',
    definitionEn:
      'A continuous sequence where one side is forced to play specific moves in a position. A series of moves where there is only one response due to checks or direct threats from the opponent',
    category: 'tactics',
  },
  {
    term: 'Forcing Move',
    termJa: 'フォーシングムーブ',
    definition:
      '相手に特定の応手を強制する手。主にチェック（Check）、キャプチャ（Capture）、スレット（Threat）の3つが代表的。CCTとして覚えられることが多い',
    definitionEn:
      'A move that forces the opponent to make a specific response. The three main types are Checks, Captures, and Threats. Often remembered as CCT',
    category: 'tactics',
  },
  {
    term: 'Full Point',
    termJa: 'フルポイント',
    definition: '試合に勝って1ポイント獲得すること',
    definitionEn: 'Winning a game and earning 1 point',
    category: 'general',
  },
  {
    term: 'Hanging',
    termJa: 'ハンギング',
    definition:
      '無防備な駒のこと。「ぶら下がっている駒」とも表現され、攻撃されているが守られていない駒、つまりタダで取れる駒のこと',
    definitionEn:
      'An undefended piece. Also expressed as a "hanging piece," it refers to a piece that is attacked but not defended, meaning it can be captured for free',
    category: 'tactics',
    isTheme: true,
  },
  {
    term: 'Half Point',
    termJa: 'ハーフポイント',
    definition: '引き分けのこと。0.5ポイントを獲得する',
    definitionEn: 'A draw. Earning 0.5 points',
    category: 'general',
  },
  {
    term: 'Hole',
    termJa: 'ホール',
    definition:
      'ポーンで守られていない、相手の駒が拠点として使いやすいマス。相手のナイトやビショップの拠点（Outpost）になりやすく、自分の駒で簡単に追い払うことができない。戦略的に支配すると、大きな優位を得られる',
    definitionEn:
      "A square not defended by pawns that can easily be used as an outpost by opponent's pieces. Likely to become an outpost for opponent's knights or bishops, and cannot be easily driven away by your pieces. Strategically controlling such squares provides significant advantages",
    category: 'structure',
    isTheme: true,
  },
  {
    term: 'Interference',
    termJa: 'インターフェアレンス',
    definition:
      '相手の駒の連携・守備・移動線を意図的に遮断する一手。敵の2つの駒の連携を遮るように自分の駒を割り込ませて、戦術的に得をする',
    definitionEn:
      "A move that intentionally blocks the coordination, defense, or lines of movement of opponent's pieces. Gaining a tactical advantage by interposing your piece to disrupt the connection between two enemy pieces",
    category: 'tactics',
    isTheme: true,
  },
  {
    term: 'Interposition',
    termJa: '合駒',
    definition:
      '攻撃を防ぐために駒を間に置く手筋。特にチェックに対して、キングと攻撃駒の間に自分の駒を置いてチェックを解除する守備的なテクニック',
    definitionEn:
      'A defensive technique of placing a piece between an attacker and the attacked piece (especially the king) to block the attack. Commonly used to block checks by interposing a piece between the checking piece and the king',
    category: 'tactics',
    isTheme: true,
  },
  {
    term: 'Isolated Pawn',
    termJa: 'アイソレイテッドポーン',
    reading: 'あいそれいてっどぽーん',
    definition:
      '隣接するファイルに味方のポーンがなく、孤立したポーン。他のポーンで支えることができないため弱点になりやすい。dポーンの場合はアイソレイテッドクイーンズポーン（IQP）と呼ぶ',
    definitionEn:
      "A pawn with no friendly pawns on adjacent files, making it isolated. It tends to become a weakness as it cannot be supported by other pawns. When it's a d-pawn, it's called an Isolated Queen's Pawn (IQP)",
    positions: [
      {
        fen: 'r1b3k1/pp2bppp/1q2p3/3rR3/3P4/3B4/PP1B1PPP/R2Q2K1 w - - 0 1',
        sortOrder: 0,
      },
    ],
    category: 'structure',
    isTheme: true,
  },
  {
    term: 'Jarchow Bishop',
    termJa: 'ヤルコフビショップ',
    definition: '（白番で）a2にビショップが閉じこもって動けない現象',
    definitionEn: 'A phenomenon where (for White) a bishop becomes trapped on a2 and cannot move',
    positions: [
      {
        fen: '2r1k3/8/8/p7/Ppp5/8/BPP5/R3K3 w Q - 0 1',
        sortOrder: 0,
      },
    ],
    category: 'structure',
  },
  {
    term: 'Key Squares',
    termJa: 'キースクエア',
    definition:
      'そのマスに到達すれば有利な側が勝つ、または不利な側がドローにできることが確定するマスのこと。エンドゲームにおいて、キングが占領すれば勝利や引き分けに大きく貢献する重要なマス。クリティカルスクエアとも呼ばれる',
    definitionEn:
      'Squares where reaching them ensures victory for the advantaged side or a draw for the disadvantaged side. Important squares in the endgame where king occupation significantly contributes to winning or drawing. Also called Critical Squares',
    aliases: ['Critical Squares'],
    category: 'endgame',
    isTheme: true,
  },
  {
    term: 'Kicks',
    termJa: 'キック',
    definition:
      '駒を追い払う手のこと。専門用語ではないがカジュアルに使われることが多い。より正式にはPawn Thrust、Chase、Forcing Move、Drive Awayなどと表現される',
    definitionEn:
      'A move that drives away a piece. Not a technical term but often used casually. More formally expressed as Pawn Thrust, Chase, Forcing Move, or Drive Away',
    category: 'general',
  },
  {
    term: 'Line',
    termJa: 'ライン',
    definition:
      '主に定跡や特定の指し手の流れのこと。オープニングや中盤で使われる特定の手順のパターンや変化。進行ルート。Variationとほぼ同じ意味で使われる',
    definitionEn:
      'Mainly refers to book moves or specific sequences of moves. Patterns or variations of specific move orders used in openings or middlegame. A progression route. Used almost synonymously with Variation',
    aliases: ['Variation'],
    category: 'opening',
  },
];
