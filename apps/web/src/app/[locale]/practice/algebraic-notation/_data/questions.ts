import type { Question } from '../_lib/types';

export const questions: Question[] = [
  {
    id: 1,
    description: {
      en: 'Select the correct notation for the following move:',
      ja: '次のmoveに対応する記法を選択してください：',
    },
    fenBefore: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    fenAfter: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
    correctAnswer: 'e4',
    move: 'e4',
    options: ['Pe4', 'E4', 'e4', 'pe4'],
    explanation: {
      en: [
        'Pawn moves do not require a piece symbol',
        'The destination square "e4" is all that\'s needed',
        'Unlike other pieces (K, Q, R, B, N), pawns are written without a prefix',
        'Uppercase "E4" is incorrect - squares are always written in lowercase',
        '"Pe4" and "pe4" are incorrect - the "P" prefix is not used for pawns',
      ],
      ja: [
        'ポーンの移動には駒記号は不要です',
        '移動先のマス"e4"だけを記載します',
        '他の駒（K、Q、R、B、N）と違い、ポーンは接頭辞なしで記述します',
        '大文字の"E4"は間違い - マスは常に小文字で記述',
        '"Pe4"や"pe4"は間違い - ポーンに"P"の接頭辞は使いません',
      ],
    },
  },
  {
    id: 2,
    description: {
      en: 'Select the correct notation for the following move:',
      ja: '次のmoveに対応する記法を選択してください：',
    },
    fenBefore: '8/2k2p2/8/6K1/6P1/8/5r2/8 b - - 0 39',
    fenAfter: '8/5p2/3k4/6K1/6P1/8/5r2/8 w - - 1 40',
    correctAnswer: 'Kd6',
    move: 'Kd6',
    options: ['d6', 'Ke3', 'kd6', 'Kd6'],
    explanation: {
      en: [
        'The king piece symbol is "K" (uppercase)',
        'The destination square is "d6"',
        'King moves are written as K + destination square',
        'Lowercase "k" is incorrect - piece symbols are always uppercase',
      ],
      ja: [
        'キングの駒記号は"K"（大文字）',
        '移動先のマスは"d6"',
        'キングの移動は K + 移動先マス で記述',
        '小文字の"k"は間違い - 駒記号は常に大文字',
      ],
    },
  },
  {
    id: 3,
    description: {
      en: 'Select the correct notation for the following move:',
      ja: '次のmoveに対応する記法を選択してください：',
    },
    fenBefore: '8/8/5k2/4p2p/1pP1K1pP/1P6/5P2/8 b - c3 0 51',
    fenAfter: '8/8/5k2/4p2p/4K1pP/1pP5/5P2/8 w - - 0 52',
    correctAnswer: 'bxc3 e.p.',
    move: 'bxc3',
    options: ['c3', 'bc3', 'bxc3 e.p.', 'Bxc3'],
    explanation: {
      en: [
        'This is an en passant capture - the pawn on b4 captures the pawn that moved to c4',
        'The notation can be written as "bxc3" or "bxc3 e.p."',
        'The "e.p." suffix is optional - both forms are correct',
        'In this exercise, "bxc3 e.p." is shown as the answer to emphasize the special move',
        '"c3" is incorrect - captures must include both the file and "x" symbol',
        '"bc3" is incorrect - captures must include the "x" symbol',
        '"Bxc3" is incorrect - pawn moves don\'t use piece symbols',
      ],
      ja: [
        'これはアンパッサン - b4のポーンがc4に進んだポーンを取ります',
        '記法は"bxc3"または"bxc3 e.p."と書けます',
        '"e.p."の接尾辞は任意 - 両方の形が正しいです',
        'この練習では特殊な手を強調するため"bxc3 e.p."を正解としています',
        '"c3"は間違い - 駒取りにはファイルと"x"記号の両方が必要',
        '"bc3"は間違い - 駒取りには"x"記号が必要',
        '"Bxc3"は間違い - ポーンの移動に駒記号は使いません',
      ],
    },
  },
  {
    id: 4,
    description: {
      en: 'Select the correct notation for the following move:',
      ja: '次のmoveに対応する記法を選択してください：',
    },
    fenBefore: '5k2/1Q6/8/3Q2P1/p2P4/P6p/5PP1/1B4K1 w - - 2 45',
    fenAfter: '3Q1k2/8/8/6P1/p2P4/P6p/5PP1/1B4K1 b - - 3 45',
    correctAnswer: 'Qd8#',
    move: 'Qd8#',
    options: ['Qd8+', 'Qd8#', 'Qd8', 'QxD8#'],
    explanation: {
      en: [
        'This move delivers checkmate - the black king has no escape',
        'Checkmate is denoted with the "#" symbol, not "+"',
        '"Qd8+" would indicate check, but this is checkmate',
        '"Qd8" without any symbol is incomplete - special moves must be marked',
        'Always use "#" for checkmate and "+" for check',
        '"QxD8#" is incorrect - there\'s no capture and squares use lowercase',
      ],
      ja: [
        'この手はチェックメイト - 黒のキングは逃げ場がありません',
        'チェックメイトは"#"記号で表記し、"+"ではありません',
        '"Qd8+"はチェックを示しますが、これはチェックメイトです',
        '記号なしの"Qd8"は不完全 - 特殊な手は必ず記号が必要',
        'チェックメイトには必ず"#"、チェックには"+"を使用',
        '"QxD8#"は間違い - 駒取りはなく、マスは小文字で記述',
      ],
    },
  },
];
