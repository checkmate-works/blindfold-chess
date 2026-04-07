const content = `# Movimento do Cavalo

## Regras de movimento

O Cavalo move-se em um **padrão em forma de L**.

Um Cavalo pode mover-se de uma casa $(file_1, rank_1)$ para outra casa $(file_2, rank_2)$ apenas se a seguinte condição for satisfeita:

$$
(|file1 - file2|, |rank1 - rank2|) \\in \\{(1,2), (2,1)\\}
$$

Isso significa que o Cavalo deve mover-se **duas casas na vertical e uma na horizontal**, ou **duas casas na horizontal e uma na vertical**.

A menos que esteja restrito pela borda do tabuleiro, um Cavalo pode mover-se para 8 casas diferentes a partir de qualquer casa dada.

-   **$(+2, +1)$**: 2 colunas à direita, 1 fileira acima
-   **$(+2, -1)$**: 2 colunas à direita, 1 fileira abaixo
-   **$(-2, +1)$**: 2 colunas à esquerda, 1 fileira acima
-   **$(-2, -1)$**: 2 colunas à esquerda, 1 fileira abaixo
-   **$(+1, +2)$**: 1 coluna à direita, 2 fileiras acima
-   **$(+1, -2)$**: 1 coluna à direita, 2 fileiras abaixo
-   **$(-1, +2)$**: 1 coluna à esquerda, 2 fileiras acima
-   **$(-1, -2)$**: 1 coluna à esquerda, 2 fileiras abaixo

## Exemplos

### e4 → f6

1.  **Posição inicial**: e4 = $(5, 4)$
2.  **Posição destino**: f6 = $(6, 6)$
3.  **Cálculo**:
    -   Diferença de coluna: $|5 - 6| = 1$
    -   Diferença de fileira: $|4 - 6| = 2$
    -   **Resultado**: ✅ Lance legal

### d3 → f4

1.  **Posição inicial**: d3 = $(4, 3)$
2.  **Posição destino**: f4 = $(6, 4)$
3.  **Cálculo**:
    -   Diferença de coluna: $|4 - 6| = 2$
    -   Diferença de fileira: $|3 - 4| = 1$
    -   **Resultado**: ✅ Lance legal

### c2 → e4

1.  **Posição inicial**: c2 = $(3, 2)$
2.  **Posição destino**: e4 = $(5, 4)$
3.  **Cálculo**:
    -   Diferença de coluna: $|3 - 5| = 2$
    -   Diferença de fileira: $|2 - 4| = 2$
    -   **Resultado**: ❌ Lance ilegal

## Outras notas especiais

- Os Cavalos podem saltar sobre outras peças.
  - Por exemplo, ao mover-se de g1 para f3, pode fazê-lo mesmo que haja peões ou outras peças em f2 ou g2.
- Um Cavalo sempre pousa em uma casa de cor oposta à de sua casa de origem.
`;

export default content;
