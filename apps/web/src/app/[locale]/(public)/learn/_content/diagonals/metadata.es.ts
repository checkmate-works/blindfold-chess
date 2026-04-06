import { commonMetadata } from './metadata.common';

export const metadata = {
  ...commonMetadata,
  title: 'Comprender las diagonales',
  tags: ['coordinates', 'bishop', 'beginner'],
  excerpt:
    'Una guía sobre las diagonales, una de las tres direcciones del tablero junto con las columnas y las filas. Incluye consejos prácticos para memorizar las diagonales del alfil en el ajedrez a ciegas.',
} as const;
