import type { ArticleMetadata } from '../../_lib/types';
import { commonMetadata } from './metadata.common';

export const metadata: ArticleMetadata = {
  ...commonMetadata,
  title: 'Superar la confusión de coordenadas en espejo',
  excerpt:
    '¿Por qué se confunden la columna a y la columna h? Comprende la diferencia entre los modelos de perspectiva fija y variable para desarrollar un reconocimiento estable de coordenadas.',
  tags: ['coordinates', 'mental-model', 'perspective', 'intermediate'],
};
