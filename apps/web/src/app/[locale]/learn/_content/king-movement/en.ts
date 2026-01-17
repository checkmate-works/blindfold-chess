const content = `# King's Movement

## Rules of Movement

The King can move only **one square at a time, vertically, horizontally, or diagonally.** While this is obvious on a physical board, in blindfold chess, calculating the legal
moves by using the origin and destination squares can provide certainty.

A King can move from a square $(file_1, rank_1)$ to another square $(file_2, rank_2)$ only if the following condition is met:

$$
\\max(|file_1 - file_2|, |rank_1 - rank_2|) = 1
$$

This means that if the **maximum of the absolute differences in file and rank is 1**, it is a legal move. The following expressions represent all 8 possible moves for the
King:

-   **Horizontal Movement**: $(1, 0)$
-   **Vertical Movement**: $(0, 1)$
-   **Diagonal Movement**: $(1, 1)$

Since mathematical explanations alone can be difficult to understand, let's look at some practical examples.

## Examples

### e4 → e5 (Vertical)

1.  **Start Position**: e4 = $(5, 4)$
2.  **Target Position**: e5 = $(5, 5)$
3.  **Calculation**:
    -   File difference: $|5 - 5| = 0$
    -   Rank difference: $|4 - 5| = 1$
    -   Maximum value: $\\max(0, 1) = 1$
    -   **Result**: ✅ Legal Move

### d3 → e4 (Diagonal)

1.  **Start Position**: d3 = $(4, 3)$
2.  **Target Position**: e4 = $(5, 4)$
3.  **Calculation**:
    -   File difference: $|4 - 5| = 1$
    -   Rank difference: $|3 - 4| = 1$
    -   Maximum value: $\\max(1, 1) = 1$
    -   **Result**: ✅ Legal Move

### c2 → e4 (Invalid)

1.  **Start Position**: c2 = $(3, 2)$
2.  **Target Position**: e4 = $(5, 4)$
3.  **Calculation**:
    -   File difference: $|3 - 5| = 2$
    -   Rank difference: $|2 - 4| = 2$
    -   Maximum value: $\\max(2, 2) = 2$
    -   **Result**: ❌ Illegal Move
`;

export default content;
