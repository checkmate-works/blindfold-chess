import { describe, expect, it } from "vitest";

import { isCompleteMove } from "./san-completeness";

describe("isCompleteMove", () => {
  it.each([
    ["kingside castling", "O-O"],
    ["queenside castling", "O-O-O"],
    ["a pawn push", "e4"],
    ["a pawn push with check", "e4+"],
    ["a pawn push with mate", "d5#"],
    ["a pawn capture", "exd5"],
    ["a pawn promotion", "e8=Q"],
    ["a pawn promotion on the first rank", "a1=N"],
    ["a pawn capture promotion", "exd8=Q"],
    ["a piece move", "Nf3"],
    ["a piece move to the last rank", "Ne8"],
    ["a piece capture", "Nxd8"],
    ["a file-disambiguated piece move", "Nbd2"],
    ["a rank-disambiguated piece move", "N1d2"],
    ["a fully disambiguated piece move", "Nb1d2"],
    ["a file-disambiguated capture onto the last rank", "Nbxd8"],
    ["a rank-disambiguated capture", "R1xd1"],
    ["a fully disambiguated capture", "Nb1xe5"],
  ])("accepts %s (%s)", (_label, input) => {
    expect(isCompleteMove(input)).toBe(true);
  });

  it.each([
    ["nothing", ""],
    ["a castling prefix", "O-"],
    ["a lone file", "e"],
    ["a pawn push to the last rank without a promotion piece", "e8"],
    ["a pawn push to the first rank without a promotion piece", "a1"],
    ["a promotion without its piece", "e8="],
    ["a promotion to a king", "e8=K"],
    ["a pawn capture to the last rank without a promotion piece", "exd8"],
    ["a pawn capture to the first rank without a promotion piece", "bxa1"],
    ["a lone piece symbol", "N"],
    ["a piece and a file", "Nf"],
    ["an off-board rank", "Nf9"],
    ["a doubled suffix", "Nf3++"],
  ])("rejects %s (%s)", (_label, input) => {
    expect(isCompleteMove(input)).toBe(false);
  });
});
