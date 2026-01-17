const content = `# Knight's Movement

## Rules of Movement

The Knight moves in an **L-shaped pattern**.

A Knight can move from a square $(file_1, rank_1)$ to another square $(file_2, rank_2)$ only if the following condition is met:

$$
(|file1 - file2|, |rank1 - rank2|) \\in \\{(1,2), (2,1)\\}
$$

This means the Knight must move either **two squares vertically and one square horizontally**, or **two squares horizontally and one square vertically**.

Unless restricted by the edge of the board, a Knight can move to 8 different squares from any given square.

-   **$(+2, +1)$**: 2 files right, 1 rank up
-   **$(+2, -1)$**: 2 files right, 1 rank down
-   **$(-2, +1)$**: 2 files left, 1 rank up
-   **$(-2, -1)$**: 2 files left, 1 rank down
-   **$(+1, +2)$**: 1 file right, 2 ranks up
-   **$(+1, -2)$**: 1 file right, 2 ranks down
-   **$(-1, +2)$**: 1 file left, 2 ranks up
-   **$(-1, -2)$**: 1 file left, 2 ranks down

## Examples

### e4 → f6

1.  **Start Position**: e4 = $(5, 4)$
2.  **Target Position**: f6 = $(6, 6)$
3.  **Calculation**:
    -   File difference: $|5 - 6| = 1$
    -   Rank difference: $|4 - 6| = 2$
    -   **Result**: ✅ Legal Move

### d3 → f4

1.  **Start Position**: d3 = $(4, 3)$
2.  **Target Position**: f4 = $(6, 4)$
3.  **Calculation**:
    -   File difference: $|4 - 6| = 2$
    -   Rank difference: $|3 - 4| = 1$
    -   **Result**: ✅ Legal Move

### c2 → e4

1.  **Start Position**: c2 = $(3, 2)$
2.  **Target Position**: e4 = $(5, 4)$
3.  **Calculation**:
    -   File difference: $|3 - 5| = 2$
    -   Rank difference: $|2 - 4| = 2$
    -   **Result**: ❌ Illegal Move

## Other Special Notes

- Knights can jump over other pieces.
  - For example, when moving from g1 to f3, it can move even if there are pawns or other pieces on f2 or g2.
- A Knight always lands on a square of the opposite color to its starting square.
`;

export default content;
