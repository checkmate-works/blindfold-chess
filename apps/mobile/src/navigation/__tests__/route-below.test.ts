import { describe, expect, it } from "vitest";

import { routeNameBelow } from "../route-below";

describe("routeNameBelow", () => {
  it("names the route under the focused one", () => {
    expect(
      routeNameBelow({
        index: 2,
        routes: [
          { name: "(tabs)" },
          { name: "practice/legal-moves/index" },
          { name: "records" },
        ],
      }),
    ).toBe("practice/legal-moves/index");
  });

  it("reads from the focused route, not the last one", () => {
    expect(
      routeNameBelow({
        index: 1,
        routes: [{ name: "(tabs)" }, { name: "records" }, { name: "ranks" }],
      }),
    ).toBe("(tabs)");
  });

  it("is undefined for the first route or without a state", () => {
    expect(routeNameBelow({ index: 0, routes: [{ name: "records" }] })).toBe(
      undefined,
    );
    expect(routeNameBelow(undefined)).toBe(undefined);
  });
});
