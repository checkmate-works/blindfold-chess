const content = `# Movimiento del alfil

## Reglas de movimiento

Un alfil puede moverse desde una casilla $(file_1, rank_1)$ a otra casilla $(file_2, rank_2)$ solo si se cumple la siguiente condición:

$$
|file_1 - file_2| = |rank_1 - rank_2|
$$

Esto significa que una jugada es legal solo si la **diferencia absoluta en columna y fila es igual**. Veamos algunos ejemplos.

## Ejemplos

### a6 → f1

1.  **Posición inicial**: a6 = $(1, 6)$
2.  **Posición objetivo**: f1 = $(6, 1)$
3.  **Cálculo**:
    -   Diferencia de columna: $|1 - 6| = 5$
    -   Diferencia de fila: $|6 - 1| = 5$
    -   **Resultado**: ✅ Jugada legal (ambas diferencias son 5 e iguales)

### c3 → e5

1.  **Posición inicial**: c3 = $(3, 3)$
2.  **Posición objetivo**: e5 = $(5, 5)$
3.  **Cálculo**:
    -   Diferencia de columna: $|3 - 5| = 2$
    -   Diferencia de fila: $|3 - 5| = 2$
    -   **Resultado**: ✅ Jugada legal

### b2 → e4 (Inválido)

1.  **Posición inicial**: b2 = $(2, 2)$
2.  **Posición objetivo**: e4 = $(5, 4)$
3.  **Cálculo**:
    -   Diferencia de columna: $|2 - 5| = 3$
    -   Diferencia de fila: $|2 - 4| = 2$
    -   **Resultado**: ❌ Jugada ilegal

## Otras notas importantes

-   Siempre permanece en casillas del mismo color.
-   Puede controlar hasta 13 casillas desde el centro.
`;

export default content;
