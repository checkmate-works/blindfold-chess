import { commonMetadata } from './metadata.common';

export const metadata = {
  ...commonMetadata,
  title: 'El secreto de la memoria de los maestros de ajedrez',
  tags: ['cognitive science', 'memory', 'pattern recognition'],
  excerpt:
    'El histórico experimento de 1946 que reveló los sorprendentes mecanismos de memoria de los maestros de ajedrez. ¿Por qué los GM recuerdan posiciones pero fallan con disposiciones aleatorias?',
} as const;
