import { describe, expect, it } from "vitest";

import { parseOAuthRedirect, resolveOAuthProviders } from "./oauth-providers";

describe("resolveOAuthProviders", () => {
  it("offers Apple on iOS even when the build variable is unset", () => {
    expect(
      resolveOAuthProviders({ setting: undefined, platform: "ios" }),
    ).toEqual(["apple"]);
  });

  it("offers nothing on Android when the build variable is unset or empty", () => {
    expect(
      resolveOAuthProviders({ setting: " ", platform: "android" }),
    ).toEqual([]);
  });

  it("offers Apple then Google on iOS, whatever order they are listed in", () => {
    expect(
      resolveOAuthProviders({ setting: "google, Apple", platform: "ios" }),
    ).toEqual(["apple", "google"]);
    expect(
      resolveOAuthProviders({ setting: "google", platform: "ios" }),
    ).toEqual(["apple", "google"]);
  });

  it("offers Google alone on Android and never Apple there", () => {
    expect(
      resolveOAuthProviders({ setting: "apple,google", platform: "android" }),
    ).toEqual(["google"]);
    expect(
      resolveOAuthProviders({ setting: "apple", platform: "android" }),
    ).toEqual([]);
  });

  it("ignores names it does not know", () => {
    expect(
      resolveOAuthProviders({ setting: "github", platform: "ios" }),
    ).toEqual(["apple"]);
  });
});

describe("parseOAuthRedirect", () => {
  it("reads the PKCE code from the query", () => {
    expect(
      parseOAuthRedirect("blindfold-chess://auth-callback?code=abc-123"),
    ).toEqual({ kind: "code", code: "abc-123" });
  });

  it("reads an Expo Go URL the same way", () => {
    expect(
      parseOAuthRedirect("exp://192.168.0.2:8081/--/auth-callback?code=xyz#"),
    ).toEqual({ kind: "code", code: "xyz" });
  });

  it("reports the error description from the query or the fragment", () => {
    expect(
      parseOAuthRedirect(
        "blindfold-chess://auth-callback?error=access_denied&error_description=User%20denied",
      ),
    ).toEqual({ kind: "error", description: "User denied" });
    expect(
      parseOAuthRedirect(
        "blindfold-chess://auth-callback#error=server_error&error_description=Provider%20disabled",
      ),
    ).toEqual({ kind: "error", description: "Provider disabled" });
  });

  it("treats a redirect without a code or error as an error", () => {
    expect(parseOAuthRedirect("blindfold-chess://auth-callback")).toEqual({
      kind: "error",
      description: "no code in redirect",
    });
  });
});
