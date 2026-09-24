/**
 * Assembles the self-contained HTML page that `StockfishWebView` loads with
 * `source={{ html }}`.
 *
 * Both engine assets are inlined rather than referenced by URL: the page is
 * inline content, so a `<script src="file://...">` may be blocked as a
 * cross-origin load, and WKWebView cannot `fetch()` a `file://` WASM URI even
 * with the file-access flags set. The WASM therefore travels as base64 and is
 * handed to the Emscripten factory as `wasmBinary`.
 *
 * The page defines `window.sendCommand(cmd)` for the native side to call via
 * `injectJavaScript`, and reports back through `ReactNativeWebView.postMessage`:
 * `'__engine_loaded__'` once the engine accepts commands, any `'Error: ...'`
 * string on failure, and raw UCI output otherwise.
 *
 * Pure: no I/O, and the same inputs always yield the same string.
 *
 * @param jsContent - Source text of `stockfish.js`, inlined into the
 *   `<script id="sf-engine">` element whose `_exports` the bootstrap reads.
 * @param wasmBase64 - The Stockfish WASM binary, base64-encoded. It is placed
 *   inside a single-quoted JS string, so it must be plain base64 (no quotes or
 *   backslashes), which `FileSystem.EncodingType.Base64` guarantees.
 */
export function buildStockfishHtml(
  jsContent: string,
  wasmBase64: string,
): string {
  return `<!DOCTYPE html>
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
}
