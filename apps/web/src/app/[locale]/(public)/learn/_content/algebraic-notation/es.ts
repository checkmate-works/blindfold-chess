const content = `# Notación Algebraica

## El lenguaje universal del ajedrez

La notación algebraica es el sistema estándar reconocido mundialmente para registrar las jugadas de ajedrez.

Es la única notación oficialmente reconocida por la FIDE para torneos y partidas, y la mayoría de los libros y materiales educativos de ajedrez también adoptan este formato. Puedes consultar el siguiente enlace para ver las especificaciones detalladas.

[Apéndice C. Notación Algebraica – Comisión de Reglas de la FIDE](https://rcc.fide.com/appendixc/)

Este artículo resume únicamente los aspectos básicos.

## Sistema de coordenadas

En la notación algebraica, cada casilla del tablero tiene una coordenada única:

- **Columnas (files)**: Etiquetadas de la a a la h, de izquierda a derecha.
- **Filas (ranks)**: Numeradas del 1 al 8, de abajo hacia arriba (desde la perspectiva de las blancas).

![demo:coordinate-board]()

## Reglas básicas de notación

### Símbolos de las piezas

Estos símbolos se refieren a todas las piezas excepto los peones.

- **Rey**: K
- **Dama**: Q
- **Torre**: R
- **Alfil**: B
- **Caballo**: N (para evitar confusión con el Rey — King)

### Notación de jugadas

Las jugadas básicas se escriben como: **[Pieza][Casilla de destino]**

## Ejemplos de jugadas comunes

### Jugadas de peón

Para los peones, solo se escribe la casilla de destino.
No es necesario añadir 'P' para el peón, como Pe4.

- **e4**: El peón se mueve a e4
- **d5**: El peón se mueve a d5
- **a7**: El peón se mueve a a7

### Jugadas de piezas

Para las piezas, se utiliza su símbolo correspondiente como prefijo.

- **Nf3**: El caballo se mueve a f3
- **Bc4**: El alfil se mueve a c4
- **Qd2**: La dama se mueve a d2
- **Kf1**: El rey se mueve a f1
- **Ra1**: La torre se mueve a a1

## Capturas

Cuando una pieza captura a otra, se utiliza la **x**.

- **exd5**: El peón en la columna e captura en d5
- **Nxe4**: El caballo captura en e4
- **Bxh7**: El alfil captura en h7
- **Qxd8**: La dama captura en d8

## Desambiguación

Cuando varias piezas del mismo tipo pueden moverse a la misma casilla, es necesario especificar cuál se mueve.

### Desambiguación por columna

- **Nbd2**: El caballo en la columna b se mueve a d2
- **Rdf1**: La torre en la columna d se mueve a f1

### Desambiguación por fila

- **R1a3**: La torre en la fila 1 se mueve a a3
- **N1f3**: El caballo en la fila 1 se mueve a f3

## Jugadas especiales

### Enroque

- **O-O**: Enroque corto (por el flanco de rey)
- **O-O-O**: Enroque largo (por el flanco de dama)

### Captura al paso

- **exd6 e.p.**: El peón captura al paso en d6
  - Sin embargo, el símbolo de captura al paso ("e.p.") puede omitirse.

### Promoción de peón

- **e8=Q**: El peón promociona a dama en e8
- **a1=N**: El peón promociona a caballo en a1

## Jaques y jaque mate

### Jaque

Se añade **+** después de la jugada.

- **Qh5+**: La dama se mueve a h5, dando jaque
- **Bc4+**: El alfil se mueve a c4, dando jaque

### Jaque mate

Se añade **#** después de la jugada.

- **Qh7#**: La dama se mueve a h7, dando jaque mate
- **Rd8#**: La torre se mueve a d8, dando jaque mate

Para el jaque mate también se admite **++**.

Ten en cuenta que la FIDE considera opcionales el + y el # (Apéndice C.13). Omitirlos no es una notación incorrecta, pero en los libros y en las partidas publicadas se escriben por costumbre, y facilitan mucho seguir la partida, así que en este artículo siempre los escribimos.

## Símbolos comunes

### Calidad de la jugada

- **!**: Buena jugada
- **!!**: Jugada brillante
- **?**: Jugada dudosa
- **??**: Error grave
- **!?**: Jugada interesante
- **?!**: Jugada cuestionable

### Símbolos de evaluación de la posición

- **=**: Posición igualada
- **±**: Las blancas tienen ligera ventaja
- **∓**: Las negras tienen ligera ventaja
- **+-**: Las blancas tienen ventaja decisiva
- **-+**: Las negras tienen ventaja decisiva

## Ejemplo de notación de una partida

A continuación tienes la notación de una obra maestra real: la "partida de la Ópera", jugada por Paul Morphy en la Ópera de París en 1858. Muestra en acción los símbolos de este artículo: capturas (x), jaques (+), el enroque largo (O-O-O), una jugada desambiguada (11...Nbd7) y el jaque mate (#).

![demo:opera-game]()

## Errores comunes que debes evitar

1.  **Escribir las piezas en minúscula**: Escribe Nf3, no nf3. Las letras de las piezas van en mayúscula, y una b minúscula no se distingue de una jugada de peón de la columna b.
2.  **Desambiguación insuficiente**: Olvidar especificar qué pieza se mueve cuando varias pueden ir a la misma casilla.
3.  **Poner la P en las jugadas de peón**: Escribe e4, no Pe4. El peón es la única pieza sin letra: la ausencia de letra es precisamente lo que lo identifica.`;

export default content;
