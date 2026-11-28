import { describe, expect, it } from "vitest";

import { isJsonObject, parseEncodedJson } from "./encoded-json";

describe("parseEncodedJson", () => {
  it("decodes a URI-encoded JSON value", () => {
    const payload = { a: [1, "b2"], c: null };
    expect(
      parseEncodedJson(encodeURIComponent(JSON.stringify(payload))),
    ).toEqual(payload);
  });

  it("parses JSON that is not encoded at all", () => {
    expect(parseEncodedJson('{"a":1}')).toEqual({ a: 1 });
  });

  it("keeps a JSON null, which is a value, apart from a missing one", () => {
    expect(parseEncodedJson("null")).toBeNull();
  });

  it.each([null, undefined, ""])(
    "is undefined for an absent param (%j)",
    (param) => {
      expect(parseEncodedJson(param)).toBeUndefined();
    },
  );

  it.each(["not-json", "{", "%E0%A4%A", "%7B%22a%22"])(
    "is undefined for a param that does not decode (%s)",
    (param) => {
      expect(parseEncodedJson(param)).toBeUndefined();
    },
  );
});

describe("isJsonObject", () => {
  it("accepts a plain object", () => {
    expect(isJsonObject({})).toBe(true);
  });

  it.each([null, [], "x", 1, undefined])("rejects %j", (value) => {
    expect(isJsonObject(value)).toBe(false);
  });
});
