const content = `# Reconoce casillas al instante con el método de puntos de anclaje

Un tablero de ajedrez tiene 64 casillas.
En lugar de memorizar cada una individualmente, existe una forma eficiente de aprenderlas usando casillas específicas como referencia.
Es el método de puntos de anclaje.

El método de puntos de anclaje es una técnica en la que **utilizas varias casillas clave como "puntos de referencia (anclas)" y las usas como base para reconocer las demás casillas**.

## Por qué los puntos de anclaje son eficaces

El cerebro humano es mejor reconociendo posiciones relativas que posiciones absolutas.
Es lo mismo que cuando miras un mapa: es más fácil entender "2 km al norte de la estación central" que si te dan las coordenadas de latitud y longitud.

De forma similar en el tablero de ajedrez, si memorizas unos pocos puntos de referencia, puedes ubicar otras casillas pensando algo como "a3 está 2 casillas arriba de a1, así que es una casilla oscura igual que a1".

## Puntos de anclaje básicos

### Las casillas de las esquinas

- a8/h8
- a1/h1

![Anchor Points at Corners](/images/learn/anchor-corners.svg)

Estas casillas son muy fáciles de memorizar y recordar.

Ya juegues con blancas o con negras, las casillas de arriba a la izquierda y abajo a la derecha son claras, y las de arriba a la derecha y abajo a la izquierda son oscuras, lo cual también es una característica fácil de entender.

Como estas son las posiciones iniciales de las torres, personalmente imagino que existen "pilares" en estas 4 ubicaciones.
Esta imagen ayuda a habituarse a ver el tablero completo sin caer en la visión de túnel, incluso en ajedrez normal, no solo en ajedrez a ciegas.

### Las 4 casillas centrales

- d5/e5
- d4/e4

![Anchor Points at Center](/images/learn/anchor-center.svg)

d4 y e4 se juegan frecuentemente como primera jugada, y d5/e5 también aparecen a menudo como respuestas.
Esto se debe a que controlar el centro es habitual según la teoría de aperturas.

Las casillas que se juegan con frecuencia son fáciles de recordar, y como son fáciles de distinguir de las casillas de las esquinas, estos también son puntos de anclaje que conviene tener presentes.

### Otros puntos de anclaje

#### Casillas de destino del enroque

- g1 (destino del rey en O-O de las blancas)
- c1 (destino del rey en O-O-O de las blancas)
- g8 (destino del rey en O-O de las negras)
- c8 (destino del rey en O-O-O de las negras)

![Anchor Points for Castling](/images/learn/anchor-castling.svg)

También es útil recordar las casillas de destino del enroque mencionadas arriba.
Recuerda que estas serán del mismo color que la casilla donde se encontraba originalmente el rey.

Por ejemplo, la posición inicial del rey blanco es e1, que es una casilla oscura.
Tanto si enroca corto (O-O) como largo (O-O-O), el destino del rey es una casilla oscura.`;

export default content;
