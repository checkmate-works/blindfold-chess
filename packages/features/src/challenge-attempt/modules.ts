/**
 * The server-side definition of every challenge module, keyed by menu type.
 *
 * Kept out of the `challenge-attempt` barrel on purpose: this file imports all
 * six modules (and through them the chess-core move tables), while the barrel
 * only carries the pure transition rules that any consumer may load cheaply.
 */
import { boardSymmetryChallengeDefinition } from "../board-symmetry/challenge";
import { coordinateQuizChallengeDefinition } from "../coordinate-quiz/challenge";
import { diagonalQuizChallengeDefinition } from "../diagonal-quiz/challenge";
import { legalMovesChallengeDefinition } from "../legal-moves/challenge";
import type { ChallengeMenuType } from "../practice-registry/registry";
import { routePlannerChallengeDefinition } from "../route-planner/challenge";
import { squareColorsChallengeDefinition } from "../square-colors/challenge";
import type { ChallengeModuleDefinition } from "./types";

/**
 * Any module's definition. Each module has its own settings, question and
 * answer types, and `ChallengeModuleDefinition` is invariant in all three, so
 * no single concrete instantiation accepts all six.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the map only checks that every menu type has a complete definition; each entry keeps its own precise type through `satisfies`
type AnyChallengeModuleDefinition = ChallengeModuleDefinition<any, any, any>;

/**
 * Every challenge menu type mapped to its definition.
 *
 * `satisfies Record<ChallengeMenuType, …>` makes adding a menu type to the
 * practice registry without a definition here a compile error, so the server
 * can never start a challenge it has no rules for.
 */
export const CHALLENGE_MODULES = {
  coordinate_quiz: coordinateQuizChallengeDefinition,
  square_colors: squareColorsChallengeDefinition,
  legal_moves: legalMovesChallengeDefinition,
  board_symmetry: boardSymmetryChallengeDefinition,
  diagonal_quiz: diagonalQuizChallengeDefinition,
  route_planner: routePlannerChallengeDefinition,
} satisfies Record<ChallengeMenuType, AnyChallengeModuleDefinition>;

/**
 * A definition with its types erased, for code that handles settings,
 * questions and answers only as stored JSON (the server's attempt rows).
 */
export type ErasedChallengeModuleDefinition = ChallengeModuleDefinition<
  unknown,
  unknown,
  unknown
>;

/**
 * Looks up a definition by a menu type that came from outside (a request or a
 * database row). Returns null for anything that is not a challenge menu type.
 *
 * The erased type is sound only as long as every value handed back to the
 * definition was produced by that same definition: settings from its
 * `parseSettings`, questions from its `generateQuestions`, answers from its
 * `parseAnswer`. An attempt row stores its menu type next to those values,
 * which is what keeps that pairing.
 */
export function getChallengeModule(
  menuType: string,
): ErasedChallengeModuleDefinition | null {
  if (!Object.hasOwn(CHALLENGE_MODULES, menuType)) return null;
  return CHALLENGE_MODULES[
    menuType as ChallengeMenuType
  ] as unknown as ErasedChallengeModuleDefinition;
}
