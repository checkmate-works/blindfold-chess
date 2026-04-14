const content = `# Movimento do Rei

## Regras de movimento

O Rei só pode mover-se **uma casa por vez, na vertical, horizontal ou diagonal.** Embora isso seja evidente em um tabuleiro físico, no xadrez às cegas, calcular os lances legais usando as casas de origem e destino pode trazer certeza.

Um Rei pode mover-se de uma casa $(file_1, rank_1)$ para outra casa $(file_2, rank_2)$ apenas se a seguinte condição for satisfeita:

$$
\\max(|file_1 - file_2|, |rank_1 - rank_2|) = 1
$$

Isso significa que se o **máximo das diferenças absolutas em coluna e fileira for 1**, trata-se de um lance legal. As seguintes expressões representam os 8 movimentos possíveis do Rei:

-   **Movimento horizontal**: $(1, 0)$
-   **Movimento vertical**: $(0, 1)$
-   **Movimento diagonal**: $(1, 1)$

Como as explicações matemáticas por si só podem ser difíceis de entender, vejamos alguns exemplos práticos.

## Exemplos

### e4 → e5 (Vertical)

1.  **Posição inicial**: e4 = $(5, 4)$
2.  **Posição destino**: e5 = $(5, 5)$
3.  **Cálculo**:
    -   Diferença de coluna: $|5 - 5| = 0$
    -   Diferença de fileira: $|4 - 5| = 1$
    -   Valor máximo: $\\max(0, 1) = 1$
    -   **Resultado**: ✅ Lance legal

### d3 → e4 (Diagonal)

1.  **Posição inicial**: d3 = $(4, 3)$
2.  **Posição destino**: e4 = $(5, 4)$
3.  **Cálculo**:
    -   Diferença de coluna: $|4 - 5| = 1$
    -   Diferença de fileira: $|3 - 4| = 1$
    -   Valor máximo: $\\max(1, 1) = 1$
    -   **Resultado**: ✅ Lance legal

### c2 → e4 (Inválido)

1.  **Posição inicial**: c2 = $(3, 2)$
2.  **Posição destino**: e4 = $(5, 4)$
3.  **Cálculo**:
    -   Diferença de coluna: $|3 - 5| = 2$
    -   Diferença de fileira: $|2 - 4| = 2$
    -   Valor máximo: $\\max(2, 2) = 2$
    -   **Resultado**: ❌ Lance ilegal
`;

export default content;
