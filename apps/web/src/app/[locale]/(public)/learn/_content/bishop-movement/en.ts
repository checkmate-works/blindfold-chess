const content = `# Bishop's Movement

## Rules of Movement

A Bishop can move from a square $(file_1, rank_1)$ to another square $(file_2, rank_2)$ only if the following condition is met:

$$
|file_1 - file_2| = |rank_1 - rank_2|
$$

This means that a move is legal only if the **absolute difference in file and rank is equal**. Let's look at some examples.

## Examples

### a6 → f1

1.  **Start Position**: a6 = $(1, 6)$
2.  **Target Position**: f1 = $(6, 1)$
3.  **Calculation**:
    -   File difference: $|1 - 6| = 5$
    -   Rank difference: $|6 - 1| = 5$
    -   **Result**: ✅ Legal Move ( both differences are 5 and equal)

### c3 → e5

1.  **Start Position**: c3 = $(3, 3)$
2.  **Target Position**: e5 = $(5, 5)$
3.  **Calculation**:
    -   File difference: $|3 - 5| = 2$
    -   Rank difference: $|3 - 5| = 2$
    -   **Result**: ✅ Legal Move

### b2 → e4 (Invalid)

1.  **Start Position**: b2 = $(2, 2)$
2.  **Target Position**: e4 = $(5, 4)$
3.  **Calculation**:
    -   File difference: $|2 - 5| = 3$
    -   Rank difference: $|2 - 4| = 2$
    -   **Result**: ❌ Illegal Move

## Other Special Notes

-   Always stays on squares of the same color.
-   Can control up to 13 squares from the center.
`;

export default content;
