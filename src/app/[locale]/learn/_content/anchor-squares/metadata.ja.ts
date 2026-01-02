import { commonMetadata } from './metadata.common';

export const metadata = {
  ...commonMetadata,
  title: 'アンカーポイント法で座標を瞬時に認識する',
  tags: ['座標', '視覚化', '初級'],
  excerpt:
    '64マスを個別に覚えるのではなく、重要なマスを基準点として活用するテクニック。目隠しチェスの第一歩に最適です。',
} as const;
