/**
 * The drag-and-drop position editor, rendered as an inert marker div.
 *
 * Opt in with a bare `vi.mock('.../EditableChessBoard')`.
 *
 * The real component mounts a pointer-driven board that jsdom cannot drive,
 * so every form test that embeds it replaced it with the same marker and
 * asserted on the FEN it was handed — the board's own behaviour is covered
 * by `EditableChessBoard.test.tsx`. `flipped` is reflected too because the
 * position-memory fields test asserts the orientation the form derives from
 * side-to-move; the tests that ignore it are unaffected by the extra
 * attribute.
 */
export function EditableChessBoard({ fen, flipped }: { fen: string; flipped?: boolean }) {
  return <div data-testid="editable-board" data-fen={fen} data-flipped={String(flipped)} />;
}
