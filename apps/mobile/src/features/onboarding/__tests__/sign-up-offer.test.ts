import { describe, expect, it } from "vitest";

import {
  armSignUpOffer,
  hasSignUpOffer,
  takeSignUpOffer,
} from "../sign-up-offer";

describe("sign-up offer flag", () => {
  it("is not pending on a fresh install", async () => {
    expect(await hasSignUpOffer()).toBe(false);
    expect(await takeSignUpOffer()).toBe(false);
  });

  it("is taken once after being armed", async () => {
    await armSignUpOffer();
    expect(await hasSignUpOffer()).toBe(true);
    expect(await takeSignUpOffer()).toBe(true);
    expect(await takeSignUpOffer()).toBe(false);
  });
});
