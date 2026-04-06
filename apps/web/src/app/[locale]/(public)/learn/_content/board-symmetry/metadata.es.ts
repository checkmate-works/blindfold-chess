import { commonMetadata } from './metadata.common';

export const metadata = {
  ...commonMetadata,
  title: 'Usar la simetría para aprender las coordenadas',
  tags: ['coordinates', 'visualization', 'beginner'],
  excerpt:
    'Aprovechando la simetría del tablero, puedes reducir a la mitad la información que necesitas memorizar. Aprende técnicas con simetría horizontal, vertical y puntual.',
} as const;
