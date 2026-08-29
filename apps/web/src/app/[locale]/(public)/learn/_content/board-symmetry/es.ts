const content = `# Usar la simetría para aprender las coordenadas

## Reducir lo que hay que memorizar

Un tablero de ajedrez tiene 64 casillas, pero no necesitas memorizar cada una individualmente.
Aprovechando la simetría del tablero, puedes reducir la cantidad de información que necesitas recordar.

## Las tres simetrías del tablero de ajedrez

### 1. Simetría horizontal (simetría de columnas)

El tablero es simétrico a lo largo del eje central entre la columna d y la columna e.

![Horizontal Symmetry on Chess Board](/images/learn/horizontal-symmetry.svg)

| Izquierda | Derecha |
|-----------|---------|
| a | h |
| b | g |
| c | f |
| d | e |

**Aplicaciones:**
- Si sabes dónde está a3, h3 es "la misma fila en el lado opuesto"
- Si conoces b7, g7 es su posición horizontalmente simétrica
- Si un caballo está en b1, el caballo opuesto está en g1

Esta simetría ayuda a entender la relación entre el flanco de rey y el flanco de dama.

### 2. Simetría vertical (simetría de filas)

El tablero es simétrico a lo largo del eje central entre la fila 4 y la fila 5.

![Vertical Symmetry on Chess Board](/images/learn/vertical-symmetry.svg)

| Lado de las blancas | Lado de las negras |
|---------------------|--------------------|
| 1 | 8 |
| 2 | 7 |
| 3 | 6 |
| 4 | 5 |

**Aplicaciones:**
- La casilla de destino del enroque de las blancas g1 y la de las negras g8 son verticalmente simétricas
- La fila inicial de los peones blancos (2.ª) y la de los negros (7.ª) son simétricas
- Una vez que aprendas la disposición de las piezas blancas, la de las negras se deduce automáticamente

### 3. Simetría central (simetría respecto al punto central)

Existe simetría puntual alrededor del centro del tablero (la intersección de d4, d5, e4, e5).

![Point Symmetry on Chess Board](/images/learn/point-symmetry.svg)

| Casilla | Casilla simétrica |
|---------|-------------------|
| a1 | h8 |
| a8 | h1 |
| b2 | g7 |
| c3 | f6 |
| d4 | e5 |

Las casillas con simetría puntual se encuentran en lados exactamente opuestos del centro del tablero.

Ten en cuenta que la simetría puntual es una combinación de la simetría horizontal y vertical.
Por ejemplo, aplicar la simetría horizontal a a1 da h1, y luego aplicar la simetría vertical da h8.
En otras palabras, si entiendes la simetría horizontal y vertical, la simetría puntual se deduce de forma natural.

## Consejos sobre simetría

Hay una relación interesante entre la simetría y el color de las casillas.

| Simetría | Color de la casilla | Ejemplo |
|----------|---------------------|---------|
| Horizontal | Diferente | a1 es oscura, h1 es clara |
| Vertical | Diferente | a1 es oscura, a8 es clara |
| Puntual | Igual | Tanto a1 como h8 son oscuras |

Conocer esta regla te permite deducir el color de una casilla a partir de su simétrica.`;

export default content;
