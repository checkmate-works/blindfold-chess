const content = `# Using Symmetry to Learn Coordinates

A chessboard has 64 squares, but you don't need to memorize each one individually.  
By focusing on the symmetry of the chessboard, you can reduce the amount of information you need to remember.

## The Three Symmetries of the Chessboard

### 1. Horizontal Symmetry (File Symmetry)

The board is symmetrical along the center axis between the d-file and e-file.

![Horizontal Symmetry on Chess Board](/images/learn/horizontal-symmetry.svg)

| Left | Right |
|------|-------|
| a | h |
| b | g |
| c | f |
| d | e |

**Applications:**
- If you know where a3 is, h3 is "the same rank on the opposite side"
- If you know b7, g7 is its horizontally symmetric position
- If a knight is on b1, the opposite knight is on g1

This symmetry helps understand the relationship between the kingside and queenside.

### 2. Vertical Symmetry (Rank Symmetry)

The board is symmetrical along the center axis between the 4th and 5th ranks.

![Vertical Symmetry on Chess Board](/images/learn/vertical-symmetry.svg)

| White's Side | Black's Side |
|--------------|--------------|
| 1 | 8 |
| 2 | 7 |
| 3 | 6 |
| 4 | 5 |

**Applications:**
- White's castling destination g1 and Black's g8 are vertically symmetric
- White's pawn starting rank (2nd) and Black's (7th) are symmetric
- Once you learn White's piece placement, Black's follows automatically

### 3. Point Symmetry (Central Point Symmetry)

There is point symmetry around the center of the board (the intersection of d4, d5, e4, e5).

![Point Symmetry on Chess Board](/images/learn/point-symmetry.svg)

| Square | Point-Symmetric Square |
|--------|----------------------|
| a1 | h8 |
| a8 | h1 |
| b2 | g7 |
| c3 | f6 |
| d4 | e5 |

Point-symmetric squares are on exactly opposite sides of the board's center.

Note that point symmetry is a combination of horizontal and vertical symmetry.
For example, applying horizontal symmetry to a1 gives h1, and then applying vertical symmetry gives h8.
In other words, if you understand horizontal and vertical symmetry, point symmetry follows naturally.

## Symmetry Tips

There's an interesting relationship between symmetry and square colors.

| Symmetry | Square Color | Example |
|----------|--------------|---------|
| Horizontal | Different | a1 is dark, h1 is light |
| Vertical | Different | a1 is dark, a8 is light |
| Point | Same | Both a1 and h8 are dark |

Knowing this rule lets you deduce a square's color from its symmetric counterpart.`;

export default content;
