const content = `# Compreender as cores das casas

## Padrão do tabuleiro

Um tabuleiro de xadrez consiste em 64 casas dispostas em uma grade de 8x8, com cores claras e escuras alternadas. Compreender esse padrão é crucial para o xadrez às cegas, pois ajuda a visualizar a colocação das peças e os padrões de movimento.

## Regra das cores

A cor de uma casa pode ser determinada facilmente conforme a soma de sua coluna e fileira é par ou ímpar.

Os passos são os seguintes:

1.  **Converta a letra da coluna em um número**: a=1, b=2, c=3, d=4, e=5, f=6, g=7, h=8
2.  **Some o número da fileira**
3.  **Se a soma for par, é uma casa escura; se for ímpar, é uma casa clara.**

Usando esse método, você pode determinar instantaneamente a cor de qualquer casa.

## Exemplos

### Cor da casa e4

1.  **Casa**: e4
2.  **Coordenadas**: e=5, fileira=4
3.  **Cálculo**: 5 + 4 = 9 (ímpar)
4.  **Resultado**: Casa clara

### Cor da casa d5

1.  **Casa**: d5
2.  **Coordenadas**: d=4, fileira=5
3.  **Cálculo**: 4 + 5 = 9 (ímpar)
4.  **Resultado**: Casa clara

## Benefício prático de determinar as cores das casas no xadrez às cegas

Isso é particularmente útil para calcular os lances legais dos Bispos.
Isso ocorre porque um Bispo de casas claras só pode mover-se para casas claras, e um Bispo de casas escuras só pode mover-se para casas escuras.

Além disso, a casa de destino de um Cavalo sempre será de uma cor diferente da sua casa atual, o que pode ajudar a verificar os lances legais.`;

export default content;
