import { commonMetadata } from './metadata.common';

export const metadata = {
  ...commonMetadata,
  title: '対称性を活用して座標を覚える',
  tags: ['座標', '視覚化', '初級'],
  excerpt:
    'チェス盤の対称性を利用すれば、覚えるべき情報量は半分になります。左右・上下・点対称を活用するテクニックを紹介します。',
} as const;
