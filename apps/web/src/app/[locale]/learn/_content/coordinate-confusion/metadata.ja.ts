import type { ArticleMetadata } from '../../_lib/types';
import { commonMetadata } from './metadata.common';

export const metadata: ArticleMetadata = {
  ...commonMetadata,
  title: '座標の鏡像混乱を克服する',
  excerpt:
    'aファイルとhファイルの混乱はなぜ起きるのか？固定視点モデルと可変視点モデルの違いを理解し、安定した座標認識を身につけましょう。',
  tags: ['coordinates', 'mental-model', 'perspective', 'intermediate'],
};
