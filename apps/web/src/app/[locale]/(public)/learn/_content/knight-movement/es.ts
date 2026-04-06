const content = `# Movimiento del Caballo

## Reglas de movimiento

El Caballo se mueve en un **patrón en forma de L**.

Un Caballo puede moverse de una casilla $(file_1, rank_1)$ a otra casilla $(file_2, rank_2)$ solo si se cumple la siguiente condición:

$$
(|file1 - file2|, |rank1 - rank2|) \\in \\{(1,2), (2,1)\\}
$$

Esto significa que el Caballo debe moverse **dos casillas en vertical y una en horizontal**, o **dos casillas en horizontal y una en vertical**.

A menos que esté restringido por el borde del tablero, un Caballo puede moverse a 8 casillas diferentes desde cualquier casilla dada.

-   **$(+2, +1)$**: 2 columnas a la derecha, 1 fila arriba
-   **$(+2, -1)$**: 2 columnas a la derecha, 1 fila abajo
-   **$(-2, +1)$**: 2 columnas a la izquierda, 1 fila arriba
-   **$(-2, -1)$**: 2 columnas a la izquierda, 1 fila abajo
-   **$(+1, +2)$**: 1 columna a la derecha, 2 filas arriba
-   **$(+1, -2)$**: 1 columna a la derecha, 2 filas abajo
-   **$(-1, +2)$**: 1 columna a la izquierda, 2 filas arriba
-   **$(-1, -2)$**: 1 columna a la izquierda, 2 filas abajo

## Ejemplos

### e4 → f6

1.  **Posición inicial**: e4 = $(5, 4)$
2.  **Posición destino**: f6 = $(6, 6)$
3.  **Cálculo**:
    -   Diferencia de columna: $|5 - 6| = 1$
    -   Diferencia de fila: $|4 - 6| = 2$
    -   **Resultado**: ✅ Jugada legal

### d3 → f4

1.  **Posición inicial**: d3 = $(4, 3)$
2.  **Posición destino**: f4 = $(6, 4)$
3.  **Cálculo**:
    -   Diferencia de columna: $|4 - 6| = 2$
    -   Diferencia de fila: $|3 - 4| = 1$
    -   **Resultado**: ✅ Jugada legal

### c2 → e4

1.  **Posición inicial**: c2 = $(3, 2)$
2.  **Posición destino**: e4 = $(5, 4)$
3.  **Cálculo**:
    -   Diferencia de columna: $|3 - 5| = 2$
    -   Diferencia de fila: $|2 - 4| = 2$
    -   **Resultado**: ❌ Jugada ilegal

## Otras notas especiales

- Los Caballos pueden saltar sobre otras piezas.
  - Por ejemplo, al moverse de g1 a f3, puede hacerlo aunque haya peones u otras piezas en f2 o g2.
- Un Caballo siempre aterriza en una casilla del color opuesto al de su casilla de origen.
`;

export default content;
