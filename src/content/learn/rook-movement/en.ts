const content = `# Rook's Movement

## Rules of Movement

The Rook is a piece that can move **only in straight lines**.

A Rook can move from a square $(file_1, rank_1)$ to another square $(file_2, rank_2)$ only if the following condition is met:

$$
file_1 = file_2 \text{ or } rank_1 = rank_2
$$

This means it can move either **vertically (up or down) on the same file**, or **horizontally (left or right) on the same rank**.

## Examples

### a1 → a8 (Vertical - Valid)

1.  **Start Position**: a1 = $(1, 1)$
2.  **Target Position**: a8 = $(1, 8)$
3.  **Calculation**:
    -   File difference: $|1 - 1| = 0$ (same file)
    -   Rank difference: $|1 - 8| = 7$ (different rank)
    -   **Result**: ✅ Legal Move

### d4 → h4 (Horizontal - Valid)

1.  **Start Position**: d4 = $(4, 4)$
2.  **Target Position**: h4 = $(8, 4)$
3.  **Calculation**:
    -   File difference: $|4 - 8| = 4$ (different file)
    -   Rank difference: $|4 - 4| = 0$ (same rank)
    -   **Result**: ✅ Legal Move

### c3 → f6 (Invalid)

1.  **Start Position**: c3 = $(3, 3)$
2.  **Target Position**: f6 = $(6, 6)$
3.  **Calculation**:
    -   File difference: $|3 - 6| = 3$ (different file)
    -   Rank difference: $|3 - 6| = 3$ (different rank)
    -   **Result**: ❌ Illegal Move
`;

export default content;
