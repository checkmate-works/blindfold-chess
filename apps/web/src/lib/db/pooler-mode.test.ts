import { describe, expect, it } from 'vitest';

import { derivePoolerMode } from './pooler-mode';

describe('derivePoolerMode', () => {
  it('classifies the Supavisor transaction pooler by its port', () => {
    expect(
      derivePoolerMode(
        'postgresql://postgres.ref:pw@aws-0-us-east-1.pooler.supabase.com:6543/postgres'
      )
    ).toBe('transaction');
  });

  it('classifies the Supavisor session pooler by host on the Postgres port', () => {
    expect(
      derivePoolerMode(
        'postgresql://postgres.ref:pw@aws-0-us-east-1.pooler.supabase.com:5432/postgres'
      )
    ).toBe('session');
  });

  it('classifies a non-pooler remote host as direct', () => {
    expect(derivePoolerMode('postgresql://postgres:pw@db.abcdefgh.supabase.co:5432/postgres')).toBe(
      'direct'
    );
  });

  it('classifies loopback development databases as local regardless of port', () => {
    expect(derivePoolerMode('postgresql://postgres:postgres@127.0.0.1:54322/postgres')).toBe(
      'local'
    );
    expect(derivePoolerMode('postgresql://postgres:postgres@localhost:5432/postgres')).toBe(
      'local'
    );
  });

  it('returns unknown for an unparseable string', () => {
    expect(derivePoolerMode('not a url')).toBe('unknown');
  });
});
