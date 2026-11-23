/**
 * Whether a hostname names this machine itself.
 *
 * `*.localhost` counts: browsers resolve every name under `.localhost` to
 * loopback on their own, and the dev server is opened as `chess.localhost` so
 * that its cookies stay apart from another product's dev server on the same
 * machine (cookies are scoped by host, not by port).
 *
 * The name is compared whole or by its `.localhost` suffix, never by prefix or
 * substring, so `localhost.example.test` and `notlocalhost` are external.
 *
 * Takes a hostname as `URL#hostname` returns it: no port, IPv6 in brackets.
 */
export function isLoopbackHostname(hostname: string): boolean {
  const name = hostname.toLowerCase();
  return (
    name === 'localhost' || name.endsWith('.localhost') || name === '127.0.0.1' || name === '[::1]'
  );
}

/** Whether `url` parses and its host is loopback. Unset or malformed is not. */
export function isLoopbackUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    return isLoopbackHostname(new URL(url).hostname);
  } catch {
    return false;
  }
}
