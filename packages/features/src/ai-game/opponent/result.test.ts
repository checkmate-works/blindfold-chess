import { describe, expect, it } from "vitest";

import { err, ok } from "./result";
import type { Result } from "./result";

describe("Result", () => {
  it("ok() carries the value with ok: true", () => {
    const r = ok(42);
    expect(r.ok).toBe(true);
    // Narrow via the discriminator so the .value access is type-safe.
    if (!r.ok) {
      throw new Error("unreachable: ok(42) should be the ok branch");
    }
    expect(r.value).toBe(42);
  });

  it("err() carries the error with ok: false", () => {
    const r = err("boom");
    expect(r.ok).toBe(false);
    if (r.ok) {
      throw new Error("unreachable: err('boom') should be the err branch");
    }
    expect(r.error).toBe("boom");
  });

  it("narrows on the ok discriminator", () => {
    const r: Result<number, string> = ok(1);
    if (r.ok) {
      const v: number = r.value;
      expect(v).toBe(1);
    } else {
      const e: string = r.error;
      throw new Error(`unreachable: got err(${e})`);
    }
  });
});
