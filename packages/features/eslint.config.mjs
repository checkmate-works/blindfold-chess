import { config } from "@blindfold-chess/eslint-config/base";
import { chessJsBan } from "@blindfold-chess/eslint-config/chess-js-ban";

/** @type {import("eslint").Linter.Config} */
export default [...config, ...chessJsBan()];
