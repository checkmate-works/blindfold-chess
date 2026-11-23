import { describe, expect, it } from "vitest";

import {
  LOCAL_SUPABASE_API_PORT,
  LOCAL_WEB_PORT,
  resolveBackendConfig,
} from "./config";

describe("resolveBackendConfig", () => {
  it("uses the build's variables when all are set", () => {
    expect(
      resolveBackendConfig({
        env: {
          supabaseUrl: "https://x.supabase.co",
          supabaseKey: "k",
          apiOrigin: "https://example.com/",
        },
        isDev: false,
        devHost: undefined,
      }),
    ).toEqual({
      supabaseUrl: "https://x.supabase.co",
      supabaseKey: "k",
      apiOrigin: "https://example.com",
    });
  });

  it("has no backend in a release build without them", () => {
    expect(
      resolveBackendConfig({ env: {}, isDev: false, devHost: "10.0.0.2" }),
    ).toBeUndefined();
  });

  it("points a development build at the Metro host's local stack", () => {
    expect(
      resolveBackendConfig({ env: {}, isDev: true, devHost: "10.0.0.2" }),
    ).toMatchObject({
      supabaseUrl: `http://10.0.0.2:${LOCAL_SUPABASE_API_PORT}`,
      apiOrigin: `http://10.0.0.2:${LOCAL_WEB_PORT}`,
    });
  });
});
