import { describe, expect, it } from 'vitest';

import { type PoolerMode, derivePoolerMode, resolvePoolMax } from './pooler-mode';

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

describe('resolvePoolMax', () => {
  it('halves the runtime cap under the session pooler (shared Pool Size)', () => {
    expect(resolvePoolMax('session', false)).toBe(5);
  });

  it.each<PoolerMode>(['transaction', 'direct', 'local', 'unknown'])(
    'gives every other mode the full runtime cap of 10 (%s)',
    (mode) => {
      expect(resolvePoolMax(mode, false)).toBe(10);
    }
  );

  it.each<PoolerMode>(['session', 'transaction', 'direct', 'local', 'unknown'])(
    'clamps to 2 during `next build` regardless of mode (%s)',
    (mode) => {
      // Static-export workers each own a pool; without this clamp the build's
      // total demand is (CPU cores − 1) × runtime max, which exhausted local
      // max_connections (SQLSTATE 53300) on a Data-Cache-cold build. See the
      // TSDoc on resolvePoolMax for the measured arithmetic.
      expect(resolvePoolMax(mode, true)).toBe(2);
    }
  );
});
