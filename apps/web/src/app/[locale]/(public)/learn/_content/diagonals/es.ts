const content = `# Comprender las diagonales

En el ajedrez existen tres términos para describir las direcciones en el tablero.

Las líneas verticales se llaman **columnas**, las líneas horizontales se llaman **filas** y las líneas oblicuas se llaman **diagonales**.
Este artículo se centra en las diagonales.

Las piezas que se mueven por las diagonales son el **alfil** y la **dama**.
Evidentemente, son piezas poderosas, y comprender las diagonales es esencial para el ajedrez a ciegas.

## Notación de las diagonales

Hay dos direcciones diagonales en el tablero.
Tomemos como ejemplo la casilla inicial del alfil de dama de las blancas.

Las diagonales que controla este alfil se llaman diagonal c1-h6 y diagonal a3-c1.

![Two diagonals controlled by the bishop on c1](/images/learn/diagonal-c1.svg)

Como se muestra con c1-h6 / a3-c1, las diagonales se expresan normalmente conectando las dos casillas extremas con un guion.

También es convención escribirlas de izquierda a derecha desde la perspectiva de las blancas.
Por ejemplo, incluso cuando juegan las negras, la diagonal se escribe c1-h6 y no h6-c1.

Sin embargo, no existe un estándar oficial estrictamente unificado, y el orden de la notación puede variar según la fuente.
Cuando juegues ajedrez a ciegas, usa el orden que te resulte más fácil de entender; no te sientas obligado a seguir una convención particular.

## Propiedades de las diagonales

Las casillas de las esquinas como a1, a8, h1 y h8 pertenecen a una sola diagonal, pero todas las demás casillas siempre pertenecen exactamente a dos diagonales.

Las diagonales también tienen la propiedad de ser **monocromáticas**.
Dado que el tablero tiene un patrón de cuadros alternados, cualquier casilla diagonal a una dada siempre será del mismo color.
Por ejemplo, la diagonal a1-h8 está compuesta íntegramente por casillas oscuras.

## Consejos prácticos de memorización

Cuando se coloca un alfil en una casilla, es importante visualizar de inmediato las diagonales que controla.
En el ajedrez a ciegas, no puedes usar el color de las casillas para identificar las líneas de ataque, así que será necesario algo de entrenamiento y práctica.

Un enfoque recomendado es dar nombre a las diagonales que usas con frecuencia y tratarlas como patrones.
Por ejemplo, si juegas habitualmente el fianchetto, colocarás a menudo tu alfil en b2 o g7.
Esto lo sitúa en la diagonal a1-h8, que es fácil de recordar.

Usar las aperturas como referencia también es eficaz.
Por ejemplo, en la Apertura Italiana, juegas Ac4, y este alfil controla las diagonales a2-g8 y a6-f1.
Darles un nombre memorable como la "diagonal italiana" puede ayudarte a fijarlas en la memoria.

Si juegas una apertura con frecuencia, memorizarás naturalmente las diagonales relevantes, y al aprender nuevas aperturas, abordarlas desde la perspectiva de cómo se usan los alfiles puede ser una excelente manera de interiorizar sus características clave.`;

export default content;
