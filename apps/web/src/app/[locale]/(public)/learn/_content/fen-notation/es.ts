const content = `# Uso de la notación FEN

¿Has oído hablar de la Notación Forsyth-Edwards (FEN)?
Aunque no estés familiarizado con el término, es posible que hayas visto cadenas como \`rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1\` en las funciones de análisis o de compartir de lichess o chess.com.
El ejemplo anterior representa la posición inicial en FEN.

## ¿Qué es FEN?

FEN permite expresar una posición de ajedrez en una sola línea de texto.
En informática, convertir estructuras de datos complejas a un formato fácil de almacenar o transmitir se denomina serialización.
Eso es exactamente lo que hace FEN.

Por ejemplo, ¿cómo comunicarías las posiciones iniciales de las piezas?
En una conversación, podrías decir "Primero, coloca el Rey en la columna e, la Dama en la columna d, luego coloca las Torres en las columnas a y h...", pero FEN condensa eficientemente toda esa información en una cadena formalizada.

Los formatos como FEN también son fáciles de procesar para los ordenadores. Por ejemplo, puedes reproducir una posición en un análisis de partida introduciendo su FEN.
Este servicio también utiliza FEN para permitir el entrenamiento en posiciones específicas.

## Especificación de FEN

Existe abundante documentación oficial que explica la especificación de FEN, así que remitimos a esos recursos.

- [Forsyth–Edwards Notation - Wikipedia](https://en.wikipedia.org/wiki/Forsyth%E2%80%93Edwards_Notation)
- [Standard: Portable Game Notation Specification and Implementation Guide](https://www.thechessdrum.net/PGN_Reference.txt) - FEN se define como parte de la especificación PGN

## Profundiza tu comprensión mediante el entrenamiento

Este servicio ofrece menús de entrenamiento para reconstruir posiciones del tablero a partir de FEN.
Normalmente, al jugar ajedrez en línea, no necesitas introducir FEN manualmente: las cadenas FEN copiadas y pegadas se convierten automáticamente en posiciones del tablero.
Sin embargo, reconstruir posiciones a mano es una forma eficaz de comprender verdaderamente FEN.
Una vez que hayas aprendido la especificación de FEN, pon a prueba tu comprensión con nuestros ejercicios de entrenamiento.`;

export default content;
