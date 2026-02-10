import { ChessTerm } from '@/app/[locale]/_lib/types';

export const chessTerms: ChessTerm[] = [
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
  },
  {
    term: 'Backward Pawn',
    termJa: 'バックワードポーン',
    definition:
      '隣のポーンに取り残され、他のポーンの支えが得ることができなくなったポーンのこと。近隣に前進させてプロテクトに充てるポーンがないため、支えがなく孤立しやすい。相手にそのポーンの前方のマス（アウトポスト）を利用されやすい。ルークやビショップなどの長距離駒に狙われやすい。特にオープンファイルやセミオープンファイル上にあると弱点になりやすい。守りが難しく、ポジション上の長期的な弱点になることが多い',
    definitionEn:
      'A pawn that has been left behind by neighboring pawns and cannot obtain support from other pawns. Without nearby pawns to advance and protect it, it becomes isolated and vulnerable. The square in front of it can be used as an outpost by the opponent. It is susceptible to attacks from long-range pieces like rooks and bishops. It becomes particularly weak when on open or semi-open files. Difficult to defend, it often becomes a long-term positional weakness',
    category: 'structure',
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
    category: 'structure',
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
  },
  {
    term: 'Closed Pawn',
    termJa: 'クローズドポーン',
    definition:
      '互いにポーン同士が向き合い、前進できなくなったファイルのポーン。Closed Positionの要因となる',
    definitionEn:
      'Pawns on a file where opposing pawns face each other and cannot advance. These contribute to creating a closed position',
    category: 'structure',
  },
  {
    term: 'Closed Position',
    termJa: 'クローズドポジション',
    definition:
      'ポーンの構造が固定され、盤面が閉じた状態。ポーンブレイクや駒のマヌーバリング（再配置）が重要になり、通常のオープンポジションとは異なる戦略が求められる',
    definitionEn:
      'A position where the pawn structure is fixed and the board is closed. Pawn breaks and piece maneuvering (repositioning) become important, requiring different strategies than in open positions',
    category: 'strategy',
  },
  {
    term: 'Color Complex',
    termJa: 'カラーコンプレックス',
    definition:
      '特定の色のマスのコントロールが弱くなった状態を意味する。ビショップを交換して弱い色を作ったり、ポーン構造によって特定の色が弱くなったりする',
    definitionEn:
      'A state where control over squares of a particular color becomes weak. This can occur after exchanging bishops or due to pawn structure that weakens specific colored squares',
    category: 'strategy',
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
  {
    term: 'Decoy',
    termJa: 'デコイ',
    definition:
      '相手の駒を意図的に不利なマス・危険なマスに誘導する戦術。誘い出した駒を利用して、次のタクティクス（フォーク、ピン、メイトなど）につなげることが目的',
    definitionEn:
      "A tactic that intentionally lures an opponent's piece to an unfavorable or dangerous square. The purpose is to use the lured piece to set up subsequent tactics (forks, pins, mate, etc.)",
    aliases: ['Attraction'],
    category: 'tactics',
  },
  {
    term: 'Deflection',
    termJa: 'デフレクション',
    definition:
      '相手の駒を、特定の守備位置から引き離す戦術。Attraction（Decoy）は特定の場所に誘い込むことが、Deflectionは特定の場所から引き離すことが目的',
    definitionEn:
      "A tactic that draws an opponent's piece away from a specific defensive position. While Attraction (Decoy) aims to lure to a specific place, Deflection aims to draw away from a specific place",
    category: 'tactics',
  },
  {
    term: 'Desperado',
    termJa: 'デスペラード',
    definition:
      'スペイン語で「ならず者」の意味。どうせ取られる駒が、相手に最大限のダメージを与えてから犠牲になる手筋を意味する。駒が逃げ場のない状況で、ただでは取られずに最後に何かを得ようとする動き',
    definitionEn:
      'Spanish for "desperado" or "outlaw." A tactic where a piece that will be captured anyway inflicts maximum damage before being taken. A move where a piece with no escape tries to gain something before being captured for free',
    category: 'tactics',
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
  },
  {
    term: 'Interference',
    termJa: 'インターフェアレンス',
    definition:
      '相手の駒の連携・守備・移動線を意図的に遮断する一手。敵の2つの駒の連携を遮るように自分の駒を割り込ませて、戦術的に得をする',
    definitionEn:
      "A move that intentionally blocks the coordination, defense, or lines of movement of opponent's pieces. Gaining a tactical advantage by interposing your piece to disrupt the connection between two enemy pieces",
    category: 'tactics',
  },
  {
    term: 'Interposition',
    termJa: '合駒',
    definition:
      '攻撃を防ぐために駒を間に置く手筋。特にチェックに対して、キングと攻撃駒の間に自分の駒を置いてチェックを解除する守備的なテクニック',
    definitionEn:
      'A defensive technique of placing a piece between an attacker and the attacked piece (especially the king) to block the attack. Commonly used to block checks by interposing a piece between the checking piece and the king',
    category: 'tactics',
  },
  {
    term: 'Isolated Pawn',
    termJa: 'アイソレイテッドポーン',
    reading: 'あいそれいてっどぽーん',
    definition:
      '隣接するファイルに味方のポーンがなく、孤立したポーン。他のポーンで支えることができないため弱点になりやすい。dポーンの場合はアイソレイテッドクイーンズポーン（IQP）と呼ぶ',
    definitionEn:
      "A pawn with no friendly pawns on adjacent files, making it isolated. It tends to become a weakness as it cannot be supported by other pawns. When it's a d-pawn, it's called an Isolated Queen's Pawn (IQP)",
    category: 'structure',
  },
  {
    term: 'Jarchow Bishop',
    termJa: 'ヤルコフビショップ',
    definition: '（白番で）a2にビショップが閉じこもって動けない現象',
    definitionEn: 'A phenomenon where (for White) a bishop becomes trapped on a2 and cannot move',
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
    category: 'tactics',
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
    category: 'endgame',
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
  },
  {
    term: 'Pawn Islands',
    termJa: 'ポーンアイランド',
    definition:
      '互いに接続していない（孤立している）ポーングループのこと。縦に隣接したポーンが途切れた結果、1つのまとまりとして存在する孤立したポーンの集団を島（アイランド）と呼ぶ。ポーンアイランドが多いほど、構造が脆弱になりやすい',
    definitionEn:
      'Groups of pawns that are not connected to each other (isolated). When vertically adjacent pawns are broken, the resulting isolated pawn groups are called islands. The more pawn islands, the more vulnerable the structure tends to be',
    category: 'structure',
  },
  {
    term: 'Pawn Break',
    termJa: 'ポーンブレイク',
    definition:
      '自分のポーンを相手のポーンにぶつけて、ポーン構造の変化を狙うこと。ルークやビショップなどのピースのためにファイルやダイアゴナルを開くことや、中央の支配権を争うために用いられる',
    definitionEn:
      'A move where you advance your pawn to challenge an enemy pawn, aiming to change the pawn structure. Used to open files or diagonals for pieces like rooks and bishops, or to contest control of the center',
    category: 'structure',
  },
  {
    term: 'Pawn Storm',
    termJa: 'ポーンストーム',
    definition:
      'ポーンを連続的に前進させて、相手のキングや駒に圧力をかける攻撃的な手法。キングサイドやクイーンサイドのどちらかでポーンをまとめて進め、相手の防御を崩す狙いがある',
    definitionEn:
      "An aggressive technique of advancing pawns continuously to pressure the opponent's king or pieces. The aim is to advance pawns together on either the kingside or queenside to break down the opponent's defense",
    category: 'strategy',
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
    category: 'structure',
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
    definition:
      'アラビア語由来の言葉で、配置、陣形、布陣という意味。序盤で定跡通りに手を進めた結果、頻繁に現れる典型的な局面のこと。そこからプレイヤーが独自の計画を考え始める分岐点となる局面',
    definitionEn:
      'An Arabic-derived word meaning arrangement, formation, or deployment. A typical position that frequently appears after following book moves in the opening. A branching point where players begin to devise their own plans',
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
  },
  {
    term: 'Zugzwang',
    termJa: 'ツークツワンク',
    reading: 'つーくつわんく',
    definition: '強制被動。手を指さなければならないが、指すことで状況が悪化する局面のこと',
    definitionEn:
      'Compulsion to move. A position where one must make a move but any move worsens the situation',
    category: 'endgame',
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
  },
];

chessTerms.sort((a, b) => a.term.localeCompare(b.term));
