const content = `# Algebraic Notation

## The Universal Language of Chess

Algebraic notation is the standard system recognized worldwide for recording chess moves.

It is the only notation officially recognized by FIDE for tournaments and matches, and most chess books and educational materials also adopt this format. Please refer to the
link below for detailed specifications.

[Appendix C. Algebraic Notation – FIDE Rules Commission](https://rcc.fide.com/appendixc/)

This article summarizes only the basic aspects.

## Coordinate System

In algebraic notation, every square on the chessboard has a unique coordinate:

- **Files (columns)**: Labeled a-h from left to right.
- **Ranks (rows)**: Numbered 1-8 from bottom to top (from White's perspective).

![demo:coordinate-board]()

## Basic Notation Rules

### Piece Symbols

These symbols refer to all pieces except pawns.

- **King**: K
- **Queen**: Q
- **Rook**: R
- **Bishop**: B
- **Knight**: N (to avoid confusion with King)

### Move Notation

Basic moves are written as: **[Piece][Destination Square]**

## Common Move Examples

### Pawn Moves

For pawns, only the destination square is written.
It is not necessary to add 'P' for pawn, like Pe4.

- **e4**: Pawn moves to e4
- **d5**: Pawn moves to d5
- **a7**: Pawn moves to a7

### Piece Moves

For pieces, their corresponding symbol is used as a prefix.

- **Nf3**: Knight moves to f3
- **Bc4**: Bishop moves to c4
- **Qd2**: Queen moves to d2
- **Kf1**: King moves to f1
- **Ra1**: Rook moves to a1

## Captures

When a piece captures another, **x** is used.

- **exd5**: Pawn on the e-file captures on d5
- **Nxe4**: Knight captures on e4
- **Bxh7**: Bishop captures on h7
- **Qxd8**: Queen captures on d8

## Disambiguation

When multiple pieces of the same type can move to the same square, it is necessary to specify which piece is moving.

### Disambiguation by File

- **Nbd2**: Knight on the b-file moves to d2
- **Rdf1**: Rook on the d-file moves to f1

### Disambiguation by Rank

- **R1a3**: Rook on the 1st rank moves to a3
- **N1f3**: Knight on the 1st rank moves to f3

## Special Moves

### Castling

- **O-O**: Kingside castling (short castling)
- **O-O-O**: Queenside castling (long castling)

### En Passant

- **exd6 e.p.**: Pawn captures en passant on d6
  - However, the en passant symbol ("e.p.") can be omitted.

### Pawn Promotion

- **e8=Q**: Pawn promotes to Queen on e8
- **a1=N**: Pawn promotes to Knight on a1

## Checks and Checkmates

### Check

Add **+** after the move.

- **Qh5+**: Queen moves to h5, checking
- **Bc4+**: Bishop moves to c4, checking

### Checkmate

Add **#** after the move.

- **Qh7#**: Queen moves to h7, checkmating
- **Rd8#**: Rook moves to d8, checkmating

**++** is also accepted for checkmate.

Note that FIDE treats + and # as optional (Appendix C.13). Leaving them out is not wrong notation, but books and game scores conventionally include them, and they make a score much easier to follow — so this article always writes them.

## Common Symbols

### Move Quality

- **!**: Good move
- **!!**: Brilliant move
- **?**: Dubious move
- **??**: Blunder
- **!?**: Interesting move
- **?!**: Questionable move

### Position Evaluation Symbols

- **=**: Equal position
- **±**: White has a slight advantage
- **∓**: Black has a slight advantage
- **+-**: White has a decisive advantage
- **-+**: Black has a decisive advantage

## Sample Game Notation

Below is the score of a real masterpiece — the "Opera Game", played by Paul Morphy at the Paris Opera in 1858. It shows the symbols from this article in action: captures (x), checks (+), queenside castling (O-O-O), a disambiguated move (11...Nbd7), and checkmate (#).

![demo:opera-game]()

## Common Mistakes to Avoid

1.  **Lowercasing piece symbols**: Write Nf3, not nf3. Piece letters are capitals, and a lowercase b is indistinguishable from a b-file pawn move.
2.  **Insufficient disambiguation**: Forgetting to specify which piece when multiple can move to the same square.
3.  **Prefixing pawn moves**: Write e4, not Pe4. The pawn is the one piece with no letter — the absence of a letter is what marks it as a pawn.`;

export default content;
