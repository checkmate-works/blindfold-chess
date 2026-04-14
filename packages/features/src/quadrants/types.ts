export type QuadrantId = "q1" | "q2" | "q3" | "q4";

export type BoardOrientation = "white" | "black" | "random";

export type QuadrantQuestion = {
  square: string;
  orientation: "white" | "black";
};
