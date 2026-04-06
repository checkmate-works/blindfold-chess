const content = `# Movimiento de la Torre

## Reglas de movimiento

La Torre es una pieza que solo puede moverse **en línea recta**.

Una Torre puede moverse de una casilla $(file_1, rank_1)$ a otra casilla $(file_2, rank_2)$ solo si se cumple la siguiente condición:

$$
file_1 = file_2 \text{ or } rank_1 = rank_2
$$

Esto significa que puede moverse **verticalmente (arriba o abajo) en la misma columna**, o **horizontalmente (izquierda o derecha) en la misma fila**.

## Ejemplos

### a1 → a8 (Vertical - Válido)

1.  **Posición inicial**: a1 = $(1, 1)$
2.  **Posición destino**: a8 = $(1, 8)$
3.  **Cálculo**:
    -   Diferencia de columna: $|1 - 1| = 0$ (misma columna)
    -   Diferencia de fila: $|1 - 8| = 7$ (diferente fila)
    -   **Resultado**: ✅ Jugada legal

### d4 → h4 (Horizontal - Válido)

1.  **Posición inicial**: d4 = $(4, 4)$
2.  **Posición destino**: h4 = $(8, 4)$
3.  **Cálculo**:
    -   Diferencia de columna: $|4 - 8| = 4$ (diferente columna)
    -   Diferencia de fila: $|4 - 4| = 0$ (misma fila)
    -   **Resultado**: ✅ Jugada legal

### c3 → f6 (Inválido)

1.  **Posición inicial**: c3 = $(3, 3)$
2.  **Posición destino**: f6 = $(6, 6)$
3.  **Cálculo**:
    -   Diferencia de columna: $|3 - 6| = 3$ (diferente columna)
    -   Diferencia de fila: $|3 - 6| = 3$ (diferente fila)
    -   **Resultado**: ❌ Jugada ilegal
`;

export default content;
