import { describe, expect, it } from 'vitest';

import { isLoopbackHostname, isLoopbackUrl } from './loopback-host';

describe('isLoopbackHostname', () => {
  it.each(['localhost', 'chess.localhost', 'a.b.localhost', 'LOCALHOST', '127.0.0.1', '[::1]'])(
    'treats %s as this machine',
    (hostname) => {
      expect(isLoopbackHostname(hostname)).toBe(true);
    }
  );

  it.each([
    // A prefix or substring match would let these through.
    'localhost.example.test',
    'notlocalhost',
    'chess.localhost.example.test',
    'www.blindfold-chess.online',
    '192.168.1.10',
    '',
  ])('treats %s as external', (hostname) => {
    expect(isLoopbackHostname(hostname)).toBe(false);
  });
});

describe('isLoopbackUrl', () => {
  it.each([
    'http://chess.localhost:3100',
    'http://localhost:3100',
    'http://127.0.0.1:55321',
    'http://[::1]:3100/en',
  ])('accepts %s', (url) => {
    expect(isLoopbackUrl(url)).toBe(true);
  });

  it.each([
    'https://www.blindfold-chess.online',
    'https://localhost.example.test',
    // "localhost" in the path or query does not make the host local.
    'https://example.test/localhost',
    'https://example.test/?next=http://localhost:3100',
    'not a url',
    '',
    undefined,
  ])('rejects %s', (url) => {
    expect(isLoopbackUrl(url)).toBe(false);
  });
});
