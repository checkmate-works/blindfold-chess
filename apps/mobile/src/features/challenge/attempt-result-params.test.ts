import { describe, expect, it } from "vitest";

import { attemptResultParams } from "./attempt-result-params";

describe("attemptResultParams", () => {
  it("hands a recorded run's attempt on", () => {
    expect(attemptResultParams("a1", false)).toEqual({ attemptId: "a1" });
  });

  it("marks a run that lost the server as interrupted", () => {
    expect(attemptResultParams("a1", true)).toEqual({
      attemptId: "a1",
      interrupted: "1",
    });
  });

  it("says nothing for a signed-out run", () => {
    expect(attemptResultParams(null, false)).toEqual({});
    expect(attemptResultParams(null, true)).toEqual({});
  });
});
