/**
 * Unit tests for `buildStockfishHtml`.
 *
 * The page it produces only ever runs inside a device WebView, where a broken
 * bootstrap fails silently. These tests pin the structural properties the
 * native side depends on — both assets inlined verbatim, in the order the
 * bootstrap needs them, and the entry points / sentinel messages that
 * `StockfishWebView` talks to — without trying to execute the engine.
 */
import { describe, expect, it } from "vitest";

import { buildStockfishHtml } from "./build-stockfish-html";

const JS_CONTENT = "/* stockfish.js stand-in */ var Stockfish = function() {};";
const WASM_BASE64 = "AGFzbQEAAAA+/w==";

function parse(html: string): Document {
  // DOMParser never executes scripts, so this only inspects the markup.
  return new DOMParser().parseFromString(html, "text/html");
}

describe("buildStockfishHtml", () => {
  it("produces a full HTML document", () => {
    const html = buildStockfishHtml(JS_CONTENT, WASM_BASE64);

    expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
    expect(html.endsWith("</html>")).toBe(true);
    expect(html).toContain('<meta charset="utf-8">');
  });

  it("is deterministic for the same inputs", () => {
    expect(buildStockfishHtml(JS_CONTENT, WASM_BASE64)).toBe(
      buildStockfishHtml(JS_CONTENT, WASM_BASE64),
    );
  });

  it("inlines the engine source verbatim in the sf-engine script", () => {
    const doc = parse(buildStockfishHtml(JS_CONTENT, WASM_BASE64));
    const engineScript = doc.getElementById("sf-engine");

    expect(engineScript?.tagName).toBe("SCRIPT");
    expect(engineScript?.textContent).toBe(JS_CONTENT);
  });

  it("inlines the WASM base64 as the argument to the decoder", () => {
    const html = buildStockfishHtml(JS_CONTENT, WASM_BASE64);

    expect(html).toContain(
      `var wasmBinary = base64ToUint8Array('${WASM_BASE64}').buffer;`,
    );
  });

  it("does not interpret template or replacement syntax in the inputs", () => {
    const trickyJs = "var s = `${x}` + '$&' + \"$1\"; // \\n";
    const doc = parse(buildStockfishHtml(trickyJs, WASM_BASE64));

    expect(doc.getElementById("sf-engine")?.textContent).toBe(trickyJs);
  });

  it("orders scripts as: wasm setup, engine source, bootstrap", () => {
    const scripts = Array.from(
      parse(buildStockfishHtml(JS_CONTENT, WASM_BASE64)).querySelectorAll(
        "script",
      ),
    );

    expect(scripts).toHaveLength(3);
    const [setup, engine, bootstrap] = scripts.map((s) => s.textContent ?? "");
    expect(setup).toContain("var wasmBinary =");
    expect(setup).toContain("window.sendCommand = function(cmd)");
    expect(engine).toBe(JS_CONTENT);
    expect(bootstrap).toContain("document.getElementById('sf-engine')");
    expect(bootstrap).toContain("wasmBinary: wasmBinary");
  });

  it("contains the bootstrap contract StockfishWebView relies on", () => {
    const html = buildStockfishHtml(JS_CONTENT, WASM_BASE64);

    // Messages back to native: readiness sentinel and "Error:"-prefixed failures.
    expect(html).toContain("window.ReactNativeWebView.postMessage(message)");
    expect(html).toContain("sendToApp('__engine_loaded__')");
    expect(html).toContain("sendToApp('Error: Stockfish factory not found')");
    // Commands go through the exported `command` function via ccall.
    expect(html).toContain("instance.ccall(");
    expect(html).toContain("'command', null, ['string'], [cmd]");
    expect(html).toContain("instance.onDoneSearching = processQueue;");
  });

  it("emits the go-command regex with a single backslash", () => {
    // The source template escapes the backslash; the page must see `\b`
    // (word boundary), not `\\b` (a literal backslash followed by "b").
    const html = buildStockfishHtml(JS_CONTENT, WASM_BASE64);

    expect(html).toContain("var isGoCmd = /^go\\b/.test(cmd);");
    expect(html).not.toContain("/^go\\\\b/");
  });
});
