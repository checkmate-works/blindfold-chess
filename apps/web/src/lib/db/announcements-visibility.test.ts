import { type SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';

import { publiclyVisibleAnnouncement, publishedAnnouncement } from './announcements-visibility';

function render(condition: SQL | undefined) {
  return new PgDialect().sqlToQuery(condition!);
}

describe('publishedAnnouncement', () => {
  it('requires the published status and a published_at timestamp', () => {
    const { sql, params } = render(publishedAnnouncement());

    expect(sql).toContain('"announcements"."status" = $1');
    expect(sql).toContain('"announcements"."published_at" is not null');
    expect(params).toEqual(['published']);
  });

  it('does not restrict visibility, so members-only announcements match', () => {
    expect(render(publishedAnnouncement()).sql).not.toContain('"visibility"');
  });
});

describe('publiclyVisibleAnnouncement', () => {
  it('is publishedAnnouncement restricted to public visibility', () => {
    const { sql, params } = render(publiclyVisibleAnnouncement());

    expect(sql).toContain(render(publishedAnnouncement()).sql);
    expect(sql).toContain('"announcements"."visibility" = $2');
    expect(params).toEqual(['published', 'public']);
  });
});
