const content = `# Movimento do bispo

## Regras de movimento

Um bispo pode mover-se de uma casa $(file_1, rank_1)$ para outra casa $(file_2, rank_2)$ apenas se a seguinte condição for satisfeita:

$$
|file_1 - file_2| = |rank_1 - rank_2|
$$

Isso significa que um lance é legal apenas se a **diferença absoluta em coluna e fileira for igual**. Vejamos alguns exemplos.

## Exemplos

### a6 → f1

1.  **Posição inicial**: a6 = $(1, 6)$
2.  **Posição objetivo**: f1 = $(6, 1)$
3.  **Cálculo**:
    -   Diferença de coluna: $|1 - 6| = 5$
    -   Diferença de fileira: $|6 - 1| = 5$
    -   **Resultado**: ✅ Lance legal (ambas as diferenças são 5 e iguais)

### c3 → e5

1.  **Posição inicial**: c3 = $(3, 3)$
2.  **Posição objetivo**: e5 = $(5, 5)$
3.  **Cálculo**:
    -   Diferença de coluna: $|3 - 5| = 2$
    -   Diferença de fileira: $|3 - 5| = 2$
    -   **Resultado**: ✅ Lance legal

### b2 → e4 (Inválido)

1.  **Posição inicial**: b2 = $(2, 2)$
2.  **Posição objetivo**: e4 = $(5, 4)$
3.  **Cálculo**:
    -   Diferença de coluna: $|2 - 5| = 3$
    -   Diferença de fileira: $|2 - 4| = 2$
    -   **Resultado**: ❌ Lance ilegal

## Outras notas importantes

-   Sempre permanece em casas da mesma cor.
-   Pode controlar até 13 casas a partir do centro.
`;

export default content;
