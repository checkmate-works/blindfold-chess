import { describe, expect, it } from "vitest";

import { generateUsername } from "./generate-username";
import { validateUsername } from "./username";

describe("generateUsername", () => {
  it("builds the suffix from the given bytes as zero-padded hex", () => {
    const bytes = new Uint8Array([0x00, 0x0f, 0xa0, 0xff, 0x12]);
    expect(generateUsername(() => bytes)).toBe("player_000fa0ff12");
  });

  it("asks for five bytes", () => {
    let asked = 0;
    generateUsername((count) => {
      asked = count;
      return new Uint8Array(count);
    });
    expect(asked).toBe(5);
  });

  it("passes the username rules at the extremes of the byte range", () => {
    expect(validateUsername(generateUsername((n) => new Uint8Array(n)))).toBe(
      null,
    );
    expect(
      validateUsername(generateUsername((n) => new Uint8Array(n).fill(255))),
    ).toBe(null);
  });

  it("uses the Web Crypto API by default", () => {
    const name = generateUsername();
    expect(name).toMatch(/^player_[0-9a-f]{10}$/);
    expect(validateUsername(name)).toBe(null);
  });
});
