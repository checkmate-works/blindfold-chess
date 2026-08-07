/** Game outcome from player's perspective */
export type GameOutcome = "in_progress" | "win" | "loss" | "draw";

/** Outcome of a finished game — {@link GameOutcome} minus the live state. */
export type FinalGameOutcome = Exclude<GameOutcome, "in_progress">;
