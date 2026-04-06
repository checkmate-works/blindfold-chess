const content = `# Comprender los colores de las casillas

## Patrón del tablero

Un tablero de ajedrez consta de 64 casillas dispuestas en una cuadrícula de 8x8, con colores claros y oscuros alternados. Comprender este patrón es crucial para el ajedrez a ciegas, ya que ayuda a visualizar la colocación de las piezas y los patrones de movimiento.

## Regla de los colores

El color de una casilla se puede determinar fácilmente según si la suma de su columna y su fila es par o impar.

Los pasos son los siguientes:

1.  **Convierte la letra de la columna a un número**: a=1, b=2, c=3, d=4, e=5, f=6, g=7, h=8
2.  **Suma el número de la fila**
3.  **Si la suma es par, es una casilla oscura; si es impar, es una casilla clara.**

Usando este método, puedes determinar instantáneamente el color de cualquier casilla.

## Ejemplos

### Color de la casilla e4

1.  **Casilla**: e4
2.  **Coordenadas**: e=5, fila=4
3.  **Cálculo**: 5 + 4 = 9 (impar)
4.  **Resultado**: Casilla clara

### Color de la casilla d5

1.  **Casilla**: d5
2.  **Coordenadas**: d=4, fila=5
3.  **Cálculo**: 4 + 5 = 9 (impar)
4.  **Resultado**: Casilla clara

## Beneficio práctico de determinar los colores de las casillas en el ajedrez a ciegas

Esto es particularmente útil para calcular las jugadas legales de los Alfiles.
Esto se debe a que un Alfil de casillas claras solo puede moverse a casillas claras, y un Alfil de casillas oscuras solo puede moverse a casillas oscuras.

Además, la casilla de destino de un Caballo siempre será de un color diferente al de su casilla actual, lo que puede ayudar a verificar las jugadas legales.`;

export default content;
