import { commonMetadata } from './metadata.common';

export const metadata = {
  ...commonMetadata,
  title: 'Reconoce casillas al instante con puntos de anclaje',
  tags: ['coordinates', 'visualization', 'beginner'],
  excerpt:
    'En lugar de memorizar 64 casillas una por una, usa casillas clave como puntos de referencia. Un primer paso perfecto para el ajedrez a ciegas.',
} as const;
