import type { ArticleMetadata } from '../../_lib/types';
import { commonMetadata } from './metadata.common';

export const metadata: ArticleMetadata = {
  ...commonMetadata,
  title: 'Superar a confusão de coordenadas espelhadas',
  excerpt:
    'Por que a coluna a e a coluna h se confundem? Compreenda a diferença entre os modelos de perspectiva fixa e variável para desenvolver um reconhecimento estável de coordenadas.',
  tags: ['coordinates', 'mental-model', 'perspective', 'intermediate'],
};
