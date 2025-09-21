const content = `# Understanding Square Colors

## Chessboard Pattern

A chessboard consists of 64 squares arranged in an 8x8 grid, with alternating light and dark colors. Understanding this pattern is crucial for blindfold chess, as it helps in
visualizing piece placement and movement patterns.

## Color Rule

The color of a chessboard square can be easily determined by whether the sum of its file (column) and rank (row) is even or odd.

The steps are as follows:

1.  **Convert the file letter to a number**: a=1, b=2, c=3, d=4, e=5, f=6, g=7, h=8
2.  **Add the rank number**
3.  **If the sum is even, it's a dark square; if odd, it's a light square.**

Using this method, you can instantly determine the color of any square.

## Examples

### Color of the e4 square

1.  **Square**: e4
2.  **Coordinates**: e=5, rank=4
3.  **Calculation**: 5 + 4 = 9 (odd)
4.  **Result**: Light square

### Color of the d5 square

1.  **Square**: d5
2.  **Coordinates**: d=4, rank=5
3.  **Calculation**: 4 + 5 = 9 (odd)
4.  **Result**: Light square

## Practical Benefit of Determining Square Colors in Blindfold Chess

This is particularly useful for calculating the legal moves of bishops.
This is because a light-squared bishop can only move to light squares, and a dark-squared bishop can only move to dark squares.

Also, a knight's destination square will always be a different color from its current square, which can help in verifying legal moves.`;

export default content;
