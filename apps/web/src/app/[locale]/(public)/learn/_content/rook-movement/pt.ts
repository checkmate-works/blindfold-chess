const content = `# Movimento da Torre

## Regras de movimento

A Torre é uma peça que só pode mover-se **em linha reta**.

Uma Torre pode mover-se de uma casa $(file_1, rank_1)$ para outra casa $(file_2, rank_2)$ apenas se a seguinte condição for satisfeita:

$$
file_1 = file_2 \text{ or } rank_1 = rank_2
$$

Isso significa que pode mover-se **verticalmente (acima ou abaixo) na mesma coluna**, ou **horizontalmente (esquerda ou direita) na mesma fileira**.

## Exemplos

### a1 → a8 (Vertical - Válido)

1.  **Posição inicial**: a1 = $(1, 1)$
2.  **Posição destino**: a8 = $(1, 8)$
3.  **Cálculo**:
    -   Diferença de coluna: $|1 - 1| = 0$ (mesma coluna)
    -   Diferença de fileira: $|1 - 8| = 7$ (fileira diferente)
    -   **Resultado**: ✅ Lance legal

### d4 → h4 (Horizontal - Válido)

1.  **Posição inicial**: d4 = $(4, 4)$
2.  **Posição destino**: h4 = $(8, 4)$
3.  **Cálculo**:
    -   Diferença de coluna: $|4 - 8| = 4$ (coluna diferente)
    -   Diferença de fileira: $|4 - 4| = 0$ (mesma fileira)
    -   **Resultado**: ✅ Lance legal

### c3 → f6 (Inválido)

1.  **Posição inicial**: c3 = $(3, 3)$
2.  **Posição destino**: f6 = $(6, 6)$
3.  **Cálculo**:
    -   Diferença de coluna: $|3 - 6| = 3$ (coluna diferente)
    -   Diferença de fileira: $|3 - 6| = 3$ (fileira diferente)
    -   **Resultado**: ❌ Lance ilegal
`;

export default content;
