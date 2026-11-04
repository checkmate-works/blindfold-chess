import { describe, expect, it } from "vitest";

import { isKnownAuthProvider } from "./auth-provider";
import {
  evaluateIdentityRemoval,
  hasWebLoginMethod,
  type LinkedIdentity,
} from "./login-methods";

const email: LinkedIdentity = {
  id: "id-email",
  provider: "email",
  email: "me@example.com",
};
const googleA: LinkedIdentity = {
  id: "id-google-a",
  provider: "google",
  email: "a@gmail.com",
};
const googleB: LinkedIdentity = {
  id: "id-google-b",
  provider: "google",
  email: "b@gmail.com",
};
const apple: LinkedIdentity = {
  id: "id-apple",
  provider: "apple",
  email: "x@privaterelay.appleid.com",
};

describe("evaluateIdentityRemoval", () => {
  it("refuses an identity the account does not have", () => {
    expect(
      evaluateIdentityRemoval(
        { identities: [googleA], hasPassword: true },
        "id-missing",
      ),
    ).toEqual({ allowed: false, reason: "notLinked" });
  });

  it("never removes the email identity", () => {
    expect(
      evaluateIdentityRemoval(
        { identities: [email, googleA], hasPassword: true },
        email.id,
      ),
    ).toEqual({ allowed: false, reason: "notRemovable" });
  });

  it("allows removing the only Google when a password exists", () => {
    expect(
      evaluateIdentityRemoval(
        { identities: [googleA], hasPassword: true },
        googleA.id,
      ),
    ).toEqual({ allowed: true, identity: googleA });
  });

  it("allows removing one Google when another Google remains (re-pointing)", () => {
    expect(
      evaluateIdentityRemoval(
        { identities: [googleA, googleB], hasPassword: false },
        googleA.id,
      ),
    ).toEqual({ allowed: true, identity: googleA });
  });

  it("refuses to remove the only Google when there is no password", () => {
    expect(
      evaluateIdentityRemoval(
        { identities: [googleA], hasPassword: false },
        googleA.id,
      ),
    ).toEqual({ allowed: false, reason: "lastWebMethod" });
  });

  it("does not count a remaining Apple as a web method", () => {
    expect(
      evaluateIdentityRemoval(
        { identities: [googleA, apple], hasPassword: false },
        googleA.id,
      ),
    ).toEqual({ allowed: false, reason: "lastWebMethod" });
  });

  it("refuses when only a password-less email identity would remain", () => {
    // A Google-only user who completed an email change has an `email`
    // identity without a password. The auth server would allow the unlink
    // (two identities), but the account could not sign in anywhere.
    expect(
      evaluateIdentityRemoval(
        { identities: [email, googleA], hasPassword: false },
        googleA.id,
      ),
    ).toEqual({ allowed: false, reason: "lastWebMethod" });
  });

  it("allows removing Apple when a Google remains", () => {
    expect(
      evaluateIdentityRemoval(
        { identities: [googleA, apple], hasPassword: false },
        apple.id,
      ),
    ).toEqual({ allowed: true, identity: apple });
  });
});

describe("hasWebLoginMethod", () => {
  it("is true with a password or a Google identity", () => {
    expect(hasWebLoginMethod({ identities: [], hasPassword: true })).toBe(true);
    expect(
      hasWebLoginMethod({ identities: [googleA], hasPassword: false }),
    ).toBe(true);
  });

  it("is false with only Apple or only a password-less email identity", () => {
    expect(hasWebLoginMethod({ identities: [apple], hasPassword: false })).toBe(
      false,
    );
    expect(hasWebLoginMethod({ identities: [email], hasPassword: false })).toBe(
      false,
    );
  });
});

describe("isKnownAuthProvider", () => {
  it("accepts email, google and apple and nothing else", () => {
    expect(isKnownAuthProvider("email")).toBe(true);
    expect(isKnownAuthProvider("google")).toBe(true);
    expect(isKnownAuthProvider("apple")).toBe(true);
    expect(isKnownAuthProvider("github")).toBe(false);
    expect(isKnownAuthProvider("")).toBe(false);
  });
});
