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

        // Build HTML with stockfish JS inlined and WASM as base64
        const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
<script>
  var engine = null;
  var isReady = false;

  function sendToApp(message) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(message);
    }
  }

  window.sendCommand = function(cmd) {
    if (engine && isReady) {
      engine.send(cmd);
    } else {
      sendToApp('Error: Engine not ready');
    }
  };

  // Decode base64-encoded WASM binary
  function base64ToUint8Array(base64) {
    var binaryString = atob(base64);
    var len = binaryString.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  var wasmBinary = base64ToUint8Array('${wasmBase64}').buffer;
</script>
<script id="sf-engine">${jsContent}</script>
<script>
  try {
    // stockfish.js uses UMD pattern: in browser, the factory is stored on
    // document.currentScript._exports of the <script> element that loaded it.
    var sfScript = document.getElementById('sf-engine');
    var sfFactory = (sfScript && sfScript._exports)
      || (typeof Stockfish !== 'undefined' ? Stockfish : null);

    if (sfFactory && typeof sfFactory === 'function') {
      var sf = sfFactory({
        wasmBinary: wasmBinary,
        locateFile: function(file) {
          return file;
        }
      });

      function setupEngine(instance) {
        // Set listener for engine output (used by Emscripten's Module.print)
        instance.listener = function(msg) {
          sendToApp(msg);
        };

        // In the document.currentScript code path, stockfish.js does NOT set
        // processCommand on the module instance (the outer setup function l()
        // is only called in worker/Node environments). We must use ccall or
        // the _command export directly.
        var commandQueue = [];

        function executeCommand(cmd) {
          var isGoCmd = /^go\\b/.test(cmd);
          instance.ccall(
            'command', null, ['string'], [cmd],
            { async: isGoCmd }
          );
        }

        function processQueue() {
          while (
            commandQueue.length &&
            (!instance._isSearching || !instance._isSearching())
          ) {
            executeCommand(commandQueue.shift());
          }
        }

        // Mirror the original processCommand: queue 'go' and 'setoption'
        // commands, execute others immediately, then drain the queue.
        function processCommand(cmd) {
          cmd = cmd.trim();
          if (cmd.substring(0, 2) === 'go' || cmd.substring(0, 9) === 'setoption') {
            commandQueue.push(cmd);
          } else {
            executeCommand(cmd);
          }
          processQueue();
        }

        // When engine finishes searching, drain queued commands
        instance.onDoneSearching = processQueue;

        engine = { send: processCommand };
        isReady = true;
        sendToApp('__engine_loaded__');
      }

      if (sf && typeof sf.then === 'function') {
        sf.then(setupEngine).catch(function(e) {
          sendToApp('Error: Engine init failed - ' + e.message);
        });
      } else if (sf && sf.ready && typeof sf.ready.then === 'function') {
        sf.ready.then(function() {
          setupEngine(sf);
        }).catch(function(e) {
          sendToApp('Error: Engine init failed - ' + e.message);
        });
      } else {
        sendToApp('Error: Unexpected factory return type: ' + typeof sf);
      }
    } else {
      sendToApp('Error: Stockfish factory not found');
    }
  } catch (e) {
    sendToApp('Error: ' + e.message);
  }
</script>
</body>
</html>`;

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
