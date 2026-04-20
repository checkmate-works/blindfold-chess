export const MAX_NOTATION_INPUT_LENGTH = 10;

export type NotationChar =
  | "K"
  | "Q"
  | "R"
  | "B"
  | "N"
  | "a"
  | "b"
  | "c"
  | "d"
  | "e"
  | "f"
  | "g"
  | "h"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "x"
  | "+"
  | "="
  | "#";

export type CastlingToken = "O-O" | "O-O-O";

export type NotationInputState = { input: string };

export type NotationInputAction =
  | { type: "appendChar"; char: NotationChar }
  | { type: "appendCastling"; move: CastlingToken }
  | { type: "backspace" }
  | { type: "clear" };
