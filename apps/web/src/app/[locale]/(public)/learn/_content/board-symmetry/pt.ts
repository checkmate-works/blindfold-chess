const content = `# Usar a simetria para aprender as coordenadas

Um tabuleiro de xadrez tem 64 casas, mas você não precisa memorizar cada uma individualmente.
Aproveitando a simetria do tabuleiro, pode reduzir a quantidade de informação que precisa lembrar.

## As três simetrias do tabuleiro de xadrez

### 1. Simetria horizontal (simetria de colunas)

O tabuleiro é simétrico ao longo do eixo central entre a coluna d e a coluna e.

![Horizontal Symmetry on Chess Board](/images/learn/horizontal-symmetry.svg)

| Esquerda | Direita |
|----------|---------|
| a | h |
| b | g |
| c | f |
| d | e |

**Aplicações:**
- Se você sabe onde está a3, h3 é "a mesma fileira no lado oposto"
- Se conhece b7, g7 é sua posição horizontalmente simétrica
- Se um cavalo está em b1, o cavalo oposto está em g1

Essa simetria ajuda a entender a relação entre o flanco do rei e o flanco da dama.

### 2. Simetria vertical (simetria de fileiras)

O tabuleiro é simétrico ao longo do eixo central entre a fileira 4 e a fileira 5.

![Vertical Symmetry on Chess Board](/images/learn/vertical-symmetry.svg)

| Lado das brancas | Lado das pretas |
|-------------------|-----------------|
| 1 | 8 |
| 2 | 7 |
| 3 | 6 |
| 4 | 5 |

**Aplicações:**
- A casa de destino do roque das brancas g1 e a das pretas g8 são verticalmente simétricas
- A fileira inicial dos peões brancos (2.ª) e a dos pretos (7.ª) são simétricas
- Uma vez que aprenda a disposição das peças brancas, a das pretas se deduz automaticamente

### 3. Simetria central (simetria em relação ao ponto central)

Existe simetria pontual ao redor do centro do tabuleiro (a interseção de d4, d5, e4, e5).

![Point Symmetry on Chess Board](/images/learn/point-symmetry.svg)

| Casa | Casa simétrica |
|------|----------------|
| a1 | h8 |
| a8 | h1 |
| b2 | g7 |
| c3 | f6 |
| d4 | e5 |

As casas com simetria central encontram-se em lados exatamente opostos do centro do tabuleiro.

Note que a simetria central é uma combinação da simetria horizontal e vertical.
Por exemplo, aplicar a simetria horizontal a a1 dá h1, e depois aplicar a simetria vertical dá h8.
Em outras palavras, se você entende a simetria horizontal e vertical, a simetria central se deduz naturalmente.

## Dicas sobre simetria

Há uma relação interessante entre a simetria e a cor das casas.

| Simetria | Cor da casa | Exemplo |
|----------|-------------|---------|
| Horizontal | Diferente | a1 é escura, h1 é clara |
| Vertical | Diferente | a1 é escura, a8 é clara |
| Central | Igual | Tanto a1 como h8 são escuras |

Conhecer essa regra permite deduzir a cor de uma casa a partir de sua simétrica.`;

export default content;
