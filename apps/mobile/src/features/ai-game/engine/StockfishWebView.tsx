import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Platform, StyleSheet } from "react-native";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import WebView from "react-native-webview";
import type { WebViewMessageEvent } from "react-native-webview";

import { buildStockfishHtml } from "./build-stockfish-html";

export type StockfishWebViewHandle = {
  /**
   * Send one raw UCI line to the engine. Fire-and-forget: replies arrive via
   * `onMessage`. Wait for `onReady` first — before the assets have loaded the
   * call is a silent no-op, and after load but before the engine is ready
   * it is dropped and reported through `onError` as `'Error: Engine not ready'`.
   */
  sendCommand: (command: string) => void;
};

type StockfishWebViewProps = {
  onMessage: (message: string) => void;
  onReady?: () => void;
  onError?: (error: string) => void;
};

/* eslint-disable @typescript-eslint/no-require-imports */
// Renamed from .js to .js.bin so Metro treats it as a binary asset,
// not a JS source module (it contains require("fs") which breaks Metro)
const stockfishJsAsset = require("../../../../assets/stockfish/stockfish.js.bin");
const stockfishWasmAsset = require("../../../../assets/stockfish/stockfish.wasm");
/* eslint-enable @typescript-eslint/no-require-imports */

type WebViewSource = {
  html: string;
  baseUrl: string;
};

/**
 * `WebView` with its extra-props parameter set explicitly. react-native-webview
 * 14.0.1 (the version Expo SDK 58 pins) declares
 * `class WebView<P = undefined> extends Component<WebViewProps & P>`, and
 * `WebViewProps & undefined` is `never`, so a bare `<WebView …>` rejects every
 * prop. 13.x and 17.x default `P` to `{}`; an empty record gives the same
 * props, and the type argument can go once the pinned version does.
 */
type NoExtraProps = Record<never, never>;
type PlainWebView = WebView<NoExtraProps>;

export const StockfishWebView = forwardRef<
  StockfishWebViewHandle,
  StockfishWebViewProps
>(function StockfishWebView({ onMessage, onReady, onError }, ref) {
  const webViewRef = useRef<PlainWebView>(null);
  const [webViewSource, setWebViewSource] = useState<WebViewSource | null>(
    null,
  );

  useEffect(() => {
    async function loadAssets() {
      try {
        const [jsAsset, wasmAsset] = await Promise.all([
          Asset.fromModule(stockfishJsAsset).downloadAsync(),
          Asset.fromModule(stockfishWasmAsset).downloadAsync(),
        ]);

        const jsUri = jsAsset.localUri;
        const wasmUri = wasmAsset.localUri;

        if (!jsUri || !wasmUri) {
          onError?.("Failed to load stockfish assets");
          return;
        }

        // Read the stockfish JS content and inline it in the HTML.
        // We can't use <script src="..."> because the HTML is loaded as inline
        // content (source={{ html }}) and cross-origin file access may not work.
        const jsContent = await FileSystem.readAsStringAsync(jsUri);

        // Read the WASM binary as base64 to embed directly in the HTML.
        // WKWebView with inline HTML cannot fetch file:// URIs even with
        // allowFileAccess flags; embedding as wasmBinary avoids this issue.
        const wasmBase64 = await FileSystem.readAsStringAsync(wasmUri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Extract the base URL (directory) from the WASM URI for any
        // fallback resource loading
        const baseUrl = wasmUri.substring(0, wasmUri.lastIndexOf("/") + 1);

        const html = buildStockfishHtml(jsContent, wasmBase64);

        setWebViewSource({ html, baseUrl });
      } catch (error) {
        onError?.(
          `Failed to load assets: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    loadAssets();
  }, [onError]);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const data = event.nativeEvent.data;
      if (data === "__engine_loaded__") {
        onReady?.();
      } else if (data.startsWith("Error:")) {
        onError?.(data);
      } else {
        onMessage(data);
      }
    },
    [onMessage, onReady, onError],
  );

  useImperativeHandle(ref, () => ({
    sendCommand: (command: string) => {
      const escaped = command.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
      webViewRef.current?.injectJavaScript(
        `window.sendCommand('${escaped}'); true;`,
      );
    },
  }));

  if (!webViewSource) {
    return null;
  }

  return (
    <WebView<NoExtraProps>
      ref={webViewRef}
      source={webViewSource}
      originWhitelist={["*"]}
      javaScriptEnabled
      allowFileAccess
      allowFileAccessFromFileURLs
      allowUniversalAccessFromFileURLs
      onMessage={handleMessage}
      onError={(event) => {
        onError?.(`WebView error: ${event.nativeEvent.description}`);
      }}
      // Both styles are needed to keep the engine's page out of the layout.
      // `style` reaches only the native web view; the library wraps it in a
      // View of its own with `flex: 1`, which `containerStyle` overrides.
      // Left to itself that wrapper takes an equal share of the screen with
      // the session's scroll view, i.e. a blank top half.
      style={styles.hidden}
      containerStyle={styles.hidden}
      {...(Platform.OS === "android" && {
        mixedContentMode: "always" as const,
      })}
    />
  );
});

const styles = StyleSheet.create({
  hidden: {
    flex: 0,
    width: 0,
    height: 0,
    opacity: 0,
    position: "absolute",
  },
});
