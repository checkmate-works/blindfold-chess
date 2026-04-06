const content = `# Movimiento del Rey

## Reglas de movimiento

El Rey solo puede moverse **una casilla a la vez, en vertical, horizontal o diagonal.** Aunque esto es evidente en un tablero físico, en el ajedrez a ciegas, calcular las jugadas legales usando las casillas de origen y destino puede aportar certeza.

Un Rey puede moverse de una casilla $(file_1, rank_1)$ a otra casilla $(file_2, rank_2)$ solo si se cumple la siguiente condición:

$$
\\max(|file_1 - file_2|, |rank_1 - rank_2|) = 1
$$

Esto significa que si el **máximo de las diferencias absolutas en columna y fila es 1**, se trata de una jugada legal. Las siguientes expresiones representan los 8 movimientos posibles del Rey:

-   **Movimiento horizontal**: $(1, 0)$
-   **Movimiento vertical**: $(0, 1)$
-   **Movimiento diagonal**: $(1, 1)$

Como las explicaciones matemáticas por sí solas pueden ser difíciles de entender, veamos algunos ejemplos prácticos.

## Ejemplos

### e4 → e5 (Vertical)

1.  **Posición inicial**: e4 = $(5, 4)$
2.  **Posición destino**: e5 = $(5, 5)$
3.  **Cálculo**:
    -   Diferencia de columna: $|5 - 5| = 0$
    -   Diferencia de fila: $|4 - 5| = 1$
    -   Valor máximo: $\\max(0, 1) = 1$
    -   **Resultado**: ✅ Jugada legal

### d3 → e4 (Diagonal)

1.  **Posición inicial**: d3 = $(4, 3)$
2.  **Posición destino**: e4 = $(5, 4)$
3.  **Cálculo**:
    -   Diferencia de columna: $|4 - 5| = 1$
    -   Diferencia de fila: $|3 - 4| = 1$
    -   Valor máximo: $\\max(1, 1) = 1$
    -   **Resultado**: ✅ Jugada legal

### c2 → e4 (Inválido)

1.  **Posición inicial**: c2 = $(3, 2)$
2.  **Posición destino**: e4 = $(5, 4)$
3.  **Cálculo**:
    -   Diferencia de columna: $|3 - 5| = 2$
    -   Diferencia de fila: $|2 - 4| = 2$
    -   Valor máximo: $\\max(2, 2) = 2$
    -   **Resultado**: ❌ Jugada ilegal
`;

export default content;
