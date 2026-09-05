import { afterEach, describe, expect, it, vi } from 'vitest';

import { normalizeDeploymentId, tagDeploymentIdInPlace } from './deployment-id';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('normalizeDeploymentId', () => {
  it('passes a deployment id through', () => {
    expect(normalizeDeploymentId('dpl_KP2S24UF6s3Toudt1GSGkTtWAfN6')).toBe(
      'dpl_KP2S24UF6s3Toudt1GSGkTtWAfN6'
    );
  });

  it('rejects the boolean literal Next substitutes when there is no deployment id', () => {
    expect(normalizeDeploymentId(false)).toBeUndefined();
  });

  it('rejects an absent value', () => {
    expect(normalizeDeploymentId(undefined)).toBeUndefined();
  });

  it('rejects an empty string', () => {
    expect(normalizeDeploymentId('')).toBeUndefined();
  });
});

describe('tagDeploymentIdInPlace', () => {
  it('tags the event with the deployment id', () => {
    vi.stubEnv('NEXT_DEPLOYMENT_ID', 'dpl_KP2S24UF6s3Toudt1GSGkTtWAfN6');
    const event: { tags?: Record<string, string> } = {};

    tagDeploymentIdInPlace(event);

    expect(event.tags?.deployment_id).toBe('dpl_KP2S24UF6s3Toudt1GSGkTtWAfN6');
  });

  it('preserves tags set by other beforeSend logic', () => {
    vi.stubEnv('NEXT_DEPLOYMENT_ID', 'dpl_KP2S24UF6s3Toudt1GSGkTtWAfN6');
    const event = { tags: { 'query_deadline.overshoot_ms': '4200' } };

    tagDeploymentIdInPlace(event);

    expect(event.tags).toEqual({
      'query_deadline.overshoot_ms': '4200',
      deployment_id: 'dpl_KP2S24UF6s3Toudt1GSGkTtWAfN6',
    });
  });

  it('leaves the event untouched when no deployment id is available', () => {
    vi.stubEnv('NEXT_DEPLOYMENT_ID', undefined);
    const event: { tags?: Record<string, string> } = {};

    tagDeploymentIdInPlace(event);

    expect(event.tags).toBeUndefined();
  });
});
