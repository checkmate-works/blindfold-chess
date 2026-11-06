import { describe, expect, it } from "vitest";

import {
  integerBetween,
  isBoolean,
  isString,
  oneOf,
  pickValidFields,
} from "./pick-valid-fields";

type Settings = {
  orientation: "white" | "black";
  count: number;
  shuffle: boolean;
  note: string;
};

const guards = {
  orientation: oneOf(["white", "black"] as const),
  count: integerBetween(1, 10),
  shuffle: isBoolean,
  note: isString,
};

describe("pickValidFields", () => {
  it("keeps every field that passes its guard", () => {
    const stored = { orientation: "black", count: 3, shuffle: false, note: "" };
    expect(pickValidFields<Settings>(stored, guards)).toEqual(stored);
  });

  it("drops only the fields that fail, so one stale field does not cost the others", () => {
    expect(
      pickValidFields<Settings>(
        { orientation: "sideways", count: 3, shuffle: "yes", note: "kept" },
        guards,
      ),
    ).toEqual({ count: 3, note: "kept" });
  });

  it("drops keys no guard names", () => {
    expect(
      pickValidFields<Settings>({ count: 2, legacyField: true }, guards),
    ).toEqual({ count: 2 });
  });

  it.each([null, 42, "white", [1, 2], undefined])(
    "returns nothing for a non-object payload (%j)",
    (payload) => {
      expect(pickValidFields<Settings>(payload, guards)).toEqual({});
    },
  );

  it("rejects non-integers and out-of-range numbers", () => {
    const guard = integerBetween(1, 10);
    expect([0, 1, 10, 11, 2.5, Number.NaN, "3"].map(guard)).toEqual([
      false,
      true,
      true,
      false,
      false,
      false,
      false,
    ]);
  });
});
