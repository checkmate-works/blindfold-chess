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

export const StockfishWebView = forwardRef<
  StockfishWebViewHandle,
  StockfishWebViewProps
>(function StockfishWebView({ onMessage, onReady, onError }, ref) {
  const webViewRef = useRef<WebView>(null);
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
    <WebView
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
      style={styles.hidden}
      {...(Platform.OS === "android" && {
        mixedContentMode: "always" as const,
      })}
    />
  );
});

const styles = StyleSheet.create({
  hidden: {
    width: 0,
    height: 0,
    opacity: 0,
    position: "absolute",
  },
});
