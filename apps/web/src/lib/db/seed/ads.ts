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

/**
 * A book the seed advertises. Its copy and thumbnail are the same in every
 * slot it runs in; only the row id differs, because the id is the sub-ID a
 * click is reported under and a report is only useful if it can tell the
 * slots apart.
 *
 * There is deliberately no link here. This repository is public, and an
 * affiliate link is the site's own business configuration rather than code:
 * a fork or a local checkout should not inherit it, and changing it should
 * not take a deploy. Every row is seeded with {@link PLACEHOLDER_AD_HREF},
 * which also keeps it from being switched on, and the real link is pasted in
 * once per book from `/admin/ads/links`.
 */
type SeedBook = {
  /** The `native_tile` glyph. Ignored by the other kinds, which have none. */
  icon: string;
  /**
   * The board every kind falls back to without an uploaded image. An opening
   * book shows the opening; any other book shows a position a reader could
   * recognize — a famous game at its critical moment, or a classic endgame
   * with only a few pieces left.
   */
  fen: string;
  copy: CreativeCopy;
};

/**
 * The books the ads link to. Titles stay in English in every locale because
 * that is the title printed on the book and on the store page the link opens;
 * every other locale's description says it is an English-language book so
 * a reader is not surprised by that page. The `es` and `pt-BR` titles are
 * left out for the same reason: a blank locale falls back to `en` per field,
 * which is the title the book has.
 *
 * Every board below was produced by replaying the named moves, not typed by
 * hand, and both games taken from their final position (the Opera Game and
 * the Immortal Game) end in checkmate when replayed, which is what confirms
 * the move orders are the real ones.
 */
const BOOKS = {
  woodpecker2: {
    icon: '🐦',
    // Morphy vs Duke Karl / Count Isouard, Paris 1858 (the Opera Game),
    // before 16.Qb8+ Nxb8 17.Rd8#.
    fen: '4kb1r/p2n1ppp/4q3/4p1B1/4P3/1Q6/PPP2PPP/2KR4 w k - 0 16',
    copy: {
      title: { en: 'The Woodpecker Method 2', ja: 'The Woodpecker Method 2' },
      description: {
        en: 'The sequel to the tactics workout built on repetition: solve the same set again and again until the patterns become automatic.',
        ja: '同じ問題集を繰り返し解いて戦術パターンを身体に染み込ませる、ウッドペッカー・メソッドの続編（洋書）。',
        es: 'La continuación del método de táctica basado en la repetición: resuelve el mismo conjunto una y otra vez hasta que los patrones salgan solos (libro en inglés).',
        'pt-BR':
          'A continuação do treino tático baseado em repetição: resolva o mesmo conjunto de novo e de novo até os padrões virarem automáticos (livro em inglês).',
      },
    },
  },
  endgameStudies: {
    icon: '🏁',
    // The Saavedra position: 1.c7 wins, but only by underpromoting to a rook.
    fen: '8/8/1KP5/3r4/8/8/8/k7 w - - 0 1',
    copy: {
      title: {
        en: '100 Endgame Studies You Must Know',
        ja: '100 Endgame Studies You Must Know',
      },
      description: {
        en: 'A hundred endgame studies: a few pieces on an open board, and one surprising way to win or draw.',
        ja: '少ない駒の中に意外な勝ち筋・引き分け筋が隠れた、エンドゲーム・スタディ100題（洋書）。',
        es: 'Cien estudios de finales: pocas piezas en un tablero abierto y una manera sorprendente de ganar o hacer tablas (libro en inglés).',
        'pt-BR':
          'Cem estudos de finais: poucas peças num tabuleiro aberto e uma maneira surpreendente de vencer ou empatar (livro em inglês).',
      },
    },
  },
  russianEndgame: {
    icon: '📕',
    // The Lucena position, the rook ending every player has to know.
    fen: '1K6/1P1k4/8/8/8/8/r7/2R5 w - - 0 1',
    copy: {
      title: { en: 'The Russian Endgame Handbook', ja: 'The Russian Endgame Handbook' },
      description: {
        en: 'The endgame positions every player needs, taught the way the Russian school teaches them.',
        ja: 'ロシア流の指導で押さえる、実戦で必須のエンドゲーム（洋書）。',
        es: 'Los finales que todo jugador necesita, enseñados como los enseña la escuela rusa (libro en inglés).',
        'pt-BR':
          'Os finais de que todo jogador precisa, ensinados como a escola russa os ensina (livro em inglês).',
      },
    },
  },
  e4Bible: {
    icon: '📖',
    // 1.e4
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    copy: {
      title: { en: '1.e4 – The Chess Bible', ja: '1.e4 – The Chess Bible' },
      description: {
        en: 'An opening repertoire for White built around 1.e4.',
        ja: '1.e4 から組み立てる白番のオープニング・レパートリー（洋書）。',
        es: 'Un repertorio de aperturas para las blancas construido en torno a 1.e4 (libro en inglés).',
        'pt-BR':
          'Um repertório de aberturas para as brancas construído em torno de 1.e4 (livro em inglês).',
      },
    },
  },
  carlsenVariation: {
    icon: '⚔️',
    // 1.e4 c5 2.Nc3 d6 3.d4 cxd4 4.Qxd4
    fen: 'rnbqkbnr/pp2pppp/3p4/8/3QP3/2N5/PPP2PPP/R1B1KBNR b KQkq - 0 4',
    copy: {
      title: {
        en: 'The Carlsen Variation – A New Anti-Sicilian',
        ja: 'The Carlsen Variation – A New Anti-Sicilian',
      },
      description: {
        en: '1.e4 c5 2.Nc3 d6 3.d4 cxd4 4.Qxd4 — the anti-Sicilian Magnus Carlsen brought to top-level play.',
        ja: 'カールセンがトップレベルで採用したアンチ・シシリアン、1.e4 c5 2.Nc3 d6 3.d4 cxd4 4.Qxd4 を解説（洋書）。',
        es: '1.e4 c5 2.Nc3 d6 3.d4 cxd4 4.Qxd4: la variante antisiciliana que Magnus Carlsen llevó a la élite (libro en inglés).',
        'pt-BR':
          '1.e4 c5 2.Nc3 d6 3.d4 cxd4 4.Qxd4: a anti-siciliana que Magnus Carlsen levou à elite (livro em inglês).',
      },
    },
  },
  sicilianWarfare: {
    icon: '🗡️',
    // 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3, the Open Sicilian.
    fen: 'rnbqkb1r/pp2pppp/3p1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R b KQkq - 2 5',
    copy: {
      title: { en: 'Sicilian Warfare', ja: 'Sicilian Warfare' },
      description: {
        en: 'The sharp battles the Sicilian Defence leads to, and the plans behind them.',
        ja: 'シシリアン・ディフェンスから生まれる激しい戦いと、その裏にある作戦を学ぶ（洋書）。',
        es: 'Las batallas afiladas a las que lleva la Defensa Siciliana y los planes que hay detrás (libro en inglés).',
        'pt-BR':
          'As batalhas afiadas a que a Defesa Siciliana leva e os planos por trás delas (livro em inglês).',
      },
    },
  },
  winWithTheFrench: {
    icon: '🛡️',
    // 1.e4 e6 2.d4 d5
    fen: 'rnbqkbnr/ppp2ppp/4p3/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 0 3',
    copy: {
      title: { en: 'Win with the French!', ja: 'Win with the French!' },
      description: {
        en: 'A fighting repertoire for Black with the French Defence, 1.e4 e6.',
        ja: '1.e4 e6、フレンチ・ディフェンスで黒番を戦うためのレパートリー（洋書）。',
        es: 'Un repertorio combativo para las negras con la Defensa Francesa, 1.e4 e6 (libro en inglés).',
        'pt-BR':
          'Um repertório combativo para as pretas com a Defesa Francesa, 1.e4 e6 (livro em inglês).',
      },
    },
  },
  kingsIndianAttack: {
    icon: '👑',
    // 1.Nf3 d5 2.g3 Nf6 3.Bg2
    fen: 'rnbqkb1r/ppp1pppp/5n2/3p4/8/5NP1/PPPPPPBP/RNBQK2R b KQkq - 2 3',
    copy: {
      title: {
        en: "Play the King's Indian Attack",
        ja: "Play the King's Indian Attack",
      },
      description: {
        en: 'IM Cyrus Lakdawala on a flexible system for White: Nf3, g3, Bg2, castle, and play a middlegame you already know.',
        ja: 'IM サイラス・ラクダワラが解説する、Nf3・g3・Bg2 で組む白番のシステム（洋書）。',
        es: 'El MI Cyrus Lakdawala explica un sistema flexible para las blancas: Nf3, g3, Bg2, enroque y un medio juego que ya conoces (libro en inglés).',
        'pt-BR':
          'O MI Cyrus Lakdawala explica um sistema flexível para as brancas: Nf3, g3, Bg2, roque e um meio-jogo que você já conhece (livro em inglês).',
      },
    },
  },
  expandYourStrategy: {
    icon: '🧭',
    // 1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.cxd5 exd5, the Carlsbad structure.
    fen: 'rnbqkb1r/ppp2ppp/5n2/3p4/3P4/2N5/PP2PPPP/R1BQKBNR w KQkq - 0 5',
    copy: {
      title: { en: 'Expand Your Chess Strategy', ja: 'Expand Your Chess Strategy' },
      description: {
        en: 'Pawn structures, plans, and what to do when there is nothing to calculate.',
        ja: 'ポーン構造や作戦の立て方など、読みだけでは届かない局面判断を広げる（洋書）。',
        es: 'Estructuras de peones, planes y qué hacer cuando no hay nada que calcular (libro en inglés).',
        'pt-BR':
          'Estruturas de peões, planos e o que fazer quando não há nada para calcular (livro em inglês).',
      },
    },
  },
  masteringExchanges: {
    icon: '🔄',
    // The Opera Game after 13.Rxd7: White gives up the exchange to open the
    // d-file.
    fen: '3rkb1r/p2Rqppp/5n2/1B2p1B1/4P3/1Q6/PPP2PPP/2K4R b k - 0 13',
    copy: {
      title: { en: 'Mastering Chess Exchanges', ja: 'Mastering Chess Exchanges' },
      description: {
        en: 'When to trade pieces and when to keep them — one of the hardest decisions in chess, taken apart.',
        ja: 'どの駒を交換し、どれを残すか。実戦で最も難しい判断のひとつを掘り下げる（洋書）。',
        es: 'Cuándo cambiar piezas y cuándo conservarlas: una de las decisiones más difíciles del ajedrez, analizada a fondo (libro en inglés).',
        'pt-BR':
          'Quando trocar peças e quando mantê-las: uma das decisões mais difíceis do xadrez, destrinchada (livro em inglês).',
      },
    },
  },
  killerAttacking: {
    icon: '🔥',
    // Anderssen vs Kieseritzky, London 1851 (the Immortal Game), before
    // 22.Qf6+ Nxf6 23.Be7#, with both rooks and a bishop already given away.
    fen: 'r1bk2nr/p2p1pNp/n2B4/1p1NP2P/6P1/3P1Q2/P1P1K3/q5b1 w - - 1 22',
    copy: {
      title: {
        en: 'A Killer Guide to Attacking Chess',
        ja: 'A Killer Guide to Attacking Chess',
      },
      description: {
        en: 'GM Jacob Aagaard on how to attack: building it up, striking at the right moment, and finishing it.',
        ja: 'GM ヤコブ・アーガードが教える、攻撃の組み立て方と仕留めどころ（洋書）。',
        es: 'El GM Jacob Aagaard enseña a atacar: preparar el ataque, golpear en el momento justo y rematarlo (libro en inglés).',
        'pt-BR':
          'O GM Jacob Aagaard ensina a atacar: preparar o ataque, golpear na hora certa e concluí-lo (livro em inglês).',
      },
    },
  },
  improveYourChessNow: {
    icon: '📈',
    // The Réti study (1921): the king catches the h-pawn by walking the
    // diagonal that also supports its own pawn.
    fen: '7K/8/k1P5/7p/8/8/8/8 w - - 0 1',
    copy: {
      title: { en: 'Improve Your Chess Now', ja: 'Improve Your Chess Now' },
      description: {
        en: 'How to think at the board: candidate moves, calculation, and the habits that stop blunders.',
        ja: '候補手の選び方と読みの鍛え方。盤上での考え方を変える一冊（洋書）。',
        es: 'Cómo pensar ante el tablero: jugadas candidatas, cálculo y los hábitos que evitan los errores graves (libro en inglés).',
        'pt-BR':
          'Como pensar diante do tabuleiro: lances candidatos, cálculo e os hábitos que evitam erros graves (livro em inglês).',
      },
    },
  },
  korchnoiBestGames: {
    icon: '📚',
    // 1.e4 e6 2.d4 d5 3.Nc3 Bb4, the French Winawer — Korchnoi's lifelong
    // defence rather than one particular game.
    fen: 'rnbqk1nr/ppp2ppp/4p3/3p4/1b1PP3/2N5/PPP2PPP/R1BQKBNR w KQkq - 2 4',
    copy: {
      title: {
        en: 'Victor Korchnoi: My Best Games',
        ja: 'Victor Korchnoi: My Best Games',
      },
      description: {
        en: 'Korchnoi annotates his own best games — honest, detailed, and full of fight.',
        ja: 'コルチノイが自身の名局を自ら解説した対局集（洋書）。',
        es: 'Korchnoi comenta sus propias mejores partidas: con honestidad, en detalle y llenas de lucha (libro en inglés).',
        'pt-BR':
          'Korchnoi comenta as próprias melhores partidas: com honestidade, em detalhe e cheias de luta (livro em inglês).',
      },
    },
  },
  learnFromLarsen: {
    icon: '📚',
    // 1.b3 e5 2.Bb2 Nc6, the opening that carries Larsen's name.
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/8/1P6/PBPPPPPP/RN1QKBNR w KQkq - 2 3',
    copy: {
      title: { en: 'Learn from Bent Larsen', ja: 'Learn from Bent Larsen' },
      description: {
        en: 'The games and ideas of Bent Larsen, one of the most original and combative players of his era.',
        ja: '独創的で闘争的な棋風で知られたベント・ラーセンの対局から学ぶ（洋書）。',
        es: 'Las partidas y las ideas de Bent Larsen, uno de los jugadores más originales y combativos de su época (libro en inglés).',
        'pt-BR':
          'As partidas e as ideias de Bent Larsen, um dos jogadores mais originais e combativos de sua época (livro em inglês).',
      },
    },
  },
  theMentalGame: {
    icon: '🧠',
    // Deep Blue vs Kasparov, New York 1997, game 6, after 8.Nxe6: the
    // sacrifice Kasparov let in, in the game that decided the match.
    fen: 'r1bqkb1r/pp1n1pp1/2p1Nn1p/8/3P4/3B1N2/PPP2PPP/R1BQK2R b KQkq - 0 8',
    copy: {
      title: { en: 'The Mental Game', ja: 'The Mental Game' },
      description: {
        en: 'The psychological side of chess: nerves, time trouble, and staying sharp from the first move to the last.',
        ja: '緊張、時間切迫、集中力。チェスの心理面と向き合うための一冊（洋書）。',
        es: 'El lado psicológico del ajedrez: los nervios, los apuros de tiempo y mantener la concentración de la primera jugada a la última (libro en inglés).',
        'pt-BR':
          'O lado psicológico do xadrez: nervosismo, falta de tempo e manter a concentração do primeiro ao último lance (livro em inglês).',
      },
    },
  },
} satisfies Record<string, SeedBook>;

type BookKey = keyof typeof BOOKS;

/** One seeded row: which book, under which fixed id. */
type SlotEntry = { id: string; book: BookKey };

/**
 * Which books run in which slot, in the order they rotate (`sortOrder`).
 * Keyed by slot, and each list is non-empty, so a new placement is a compile
 * error until it names at least one book.
 *
 * The books follow what the reader is doing on the surface: the opening
 * books sit on the topic pages, the tactics and endgame books next to
 * puzzles and on practice results, game collections next to game lists and
 * the position-memory problems, and the broad how-to-improve books wherever
 * the reader has not yet chosen a subject (the home feed, the glossary).
 * A surface that shows one creative rather than a rotating list shows the
 * first entry.
 */
const SLOT_BOOKS = {
  'feed-native-ad': [
    { id: '683b5ef5-57f4-4918-a2d3-583ff01b128e', book: 'improveYourChessNow' },
    { id: '0ffc2224-3fa7-4a42-9fa3-459f8b854de0', book: 'woodpecker2' },
    { id: 'a10c0d4f-412a-4019-8c07-8b7c0a1008d1', book: 'theMentalGame' },
    { id: '90cf6030-6475-45f9-9a3e-a0ef7f9da5e1', book: 'e4Bible' },
  ],
  'topic-catalog-native-ad': [
    { id: '693059d6-8085-4173-8a13-7324f182d7c6', book: 'e4Bible' },
    { id: '522aea93-6cba-4a6c-8d8c-cf63da8c4036', book: 'sicilianWarfare' },
    { id: 'fc2aae51-8b3d-47d7-aee1-2a6342ff2ac6', book: 'winWithTheFrench' },
    { id: '124c7c64-3f22-41a0-9884-2ea86be40194', book: 'kingsIndianAttack' },
    { id: 'a5af4a1f-e92e-461d-bd48-3d4acce28ac3', book: 'carlsenVariation' },
  ],
  'topic-detail-native-ad': [
    { id: '9fcb1e01-a18b-49a5-a514-5b7fb6132686', book: 'sicilianWarfare' },
    { id: '6b79d4ce-0377-49af-8661-fb51210e4a4a', book: 'carlsenVariation' },
    { id: '0c262493-9723-42d1-ae3c-c4460f799684', book: 'winWithTheFrench' },
    { id: '35eb51be-3d7e-4049-8210-c6c82a9aa593', book: 'kingsIndianAttack' },
    { id: 'fb9e3c2a-21c3-48e1-a0d6-61b304ac1735', book: 'e4Bible' },
  ],
  'chunk-list-native-ad': [
    { id: '80cfb467-0374-4565-ab19-7141c5a3bc10', book: 'expandYourStrategy' },
    { id: '7af89ff9-6471-4993-aebe-293a4c40cf4b', book: 'masteringExchanges' },
    { id: '7f965280-04bf-437f-a9c4-fe12ab1cb905', book: 'woodpecker2' },
  ],
  'glossary-term-list-native-ad': [
    { id: 'd96d9856-e05c-4ac3-81a6-1928e82e6702', book: 'improveYourChessNow' },
    { id: 'b7d22e2c-7175-4ba8-a3b7-50721d68158d', book: 'expandYourStrategy' },
    { id: '598a9d0e-7a94-41d7-a20b-7617b04f3e21', book: 'e4Bible' },
  ],
  'puzzle-result-native-ad': [
    { id: 'e29c3f11-63f4-455a-aab4-bfccdf1ba460', book: 'woodpecker2' },
    { id: '9462e5f8-ca22-429b-8c0f-c17bb39779c5', book: 'killerAttacking' },
    { id: 'af511044-fede-4e76-9129-3b5ba0ce3647', book: 'endgameStudies' },
  ],
  'puzzle-detail-native-ad': [
    { id: '8cca7923-344c-4615-a974-43f772f54677', book: 'woodpecker2' },
    { id: '62ca7efc-44aa-4613-bbf8-9cb3a33e8d91', book: 'killerAttacking' },
    { id: '96353f95-cc52-433f-8ec5-c1b3f9fdb954', book: 'endgameStudies' },
  ],
  'position-memory-result-native-ad': [
    { id: 'b028a0d3-c164-45a5-a754-e9d35282a032', book: 'russianEndgame' },
    { id: '998a7758-36f3-4b67-99fb-130dc92bf412', book: 'korchnoiBestGames' },
    { id: '41fa7efe-6d82-42d6-a155-f3983d75bd5a', book: 'learnFromLarsen' },
  ],
  'position-memory-detail-native-ad': [
    { id: 'fbef3a53-0b6a-4df7-b6cc-830447776371', book: 'russianEndgame' },
    { id: '399cb54b-3b4b-45fe-9e1e-810cce31a6d3', book: 'korchnoiBestGames' },
    { id: '39e2a404-efc6-4dd9-8f2e-86599f837dde', book: 'learnFromLarsen' },
  ],
  'leaderboard-top-native-ad': [
    { id: '75f31b9f-0073-4619-b120-b48e3d208153', book: 'theMentalGame' },
    { id: 'befb2112-17c8-4726-93b2-3b03a530fb80', book: 'improveYourChessNow' },
  ],
  'practice-result-native-ad': [
    { id: '0e0770e1-f8cd-49b1-9431-6b2ca82711b4', book: 'woodpecker2' },
    { id: '3757cc7e-8ac8-4110-9467-295fbe55970b', book: 'improveYourChessNow' },
    { id: '63c04075-1a1b-4f38-a8b7-c16ac91bba00', book: 'russianEndgame' },
  ],
  'practice-grid-native-ad': [
    { id: '5f8f622f-497a-4c48-b938-6c5865af57fe', book: 'woodpecker2' },
    { id: 'bac48838-3235-401e-8b60-9f73268c51ca', book: 'endgameStudies' },
  ],
  'puzzle-list-native-ad': [
    { id: '0e16b1fc-bc58-45cd-b218-42a98f21f319', book: 'woodpecker2' },
    { id: '0d686ae2-767f-4651-a470-325bb78f4ad6', book: 'killerAttacking' },
    { id: '8913ba55-1edb-4cba-8c70-c5451eed4165', book: 'endgameStudies' },
  ],
  'position-memory-list-native-ad': [
    { id: '708da6a5-56a7-4ab4-b4f3-87f6529a0957', book: 'russianEndgame' },
    { id: 'ed69e9ba-5c57-4e98-bc2d-21c5dae9a0ed', book: 'korchnoiBestGames' },
    { id: 'cf4fcd56-b9d8-4cb2-9fe6-b3c7af685d9d', book: 'learnFromLarsen' },
  ],
  'shared-game-list-native-ad': [
    { id: '5975aa0a-54f8-46ed-92e9-10ee93f74730', book: 'korchnoiBestGames' },
    { id: 'c9155499-761c-4b7d-bad1-a17fa4b4af84', book: 'learnFromLarsen' },
    { id: 'e87ec236-7ec7-4f39-96c9-47e07cec6333', book: 'theMentalGame' },
  ],
  'my-game-list-native-ad': [
    { id: 'e65233ac-3ffc-4108-8044-f8c9ebf18601', book: 'korchnoiBestGames' },
    { id: '0d6d667a-852c-4200-bb83-139c6c05770a', book: 'learnFromLarsen' },
    { id: 'fe38d0b1-c60a-41d1-8ba8-eee74628821f', book: 'theMentalGame' },
  ],
} satisfies Record<AdSlot, readonly [SlotEntry, ...SlotEntry[]]>;

const seedCreatives: SeedCreative[] = AD_SLOT_VALUES.flatMap((slot) =>
  SLOT_BOOKS[slot].map(({ id, book }, sortOrder) => {
    const { icon, fen, copy } = BOOKS[book];
    return {
      id,
      slot,
      href: PLACEHOLDER_AD_HREF,
      isActive: false,
      sortOrder,
      icon,
      thumbnail: { fen },
      copy,
    };
  })
);

/**
 * Insert-only. A creative the seed has already written is left exactly as the
 * admin has since edited it: the conflict target is the fixed `id`, so a
 * re-run writes nothing over a row that exists and only adds rows that are
 * new. Copy rows follow the same rule on `(creative_id, locale)`.
 *
 * That is what makes re-seeding safe once the rows are live: a link the
 * admin pasted, copy they reworded, or a creative they switched on stays
 * exactly as they left it. The flip side is that editing {@link BOOKS} only
 * reaches rows that do not exist yet — to change a deployed creative, edit it
 * in `/admin/ads`.
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
