# Release Process

Use the Claude Code skill to generate release notes:

```
/web-release-notes v0.3.0
```

This skill automates the release workflow:

1. **Gather changes**: Analyzes commits since the previous `web/vX.X.X` tag
2. **Generate content**: Creates release notes in English and Japanese
3. **User review**: Presents content for approval before proceeding
4. **Update CHANGELOG**: Adds entry to `apps/web/CHANGELOG.md`
5. **Create git tag**: Creates annotated tag `web/v0.3.0`
6. **Output SQL**: Writes INSERT statements to `/tmp/release-web-v0.3.0.sql` for the posts table

## Prerequisites

Before running for the first time, ensure at least one previous tag exists:

```bash
git tag -a web/v0.2.0 <commit-hash> -m "Release web v0.2.0"
```

## Manual SQL Execution

After the skill completes, review and execute the generated SQL:

```bash
# Review the SQL file
cat /tmp/release-web-v0.3.0.sql

# Execute against your database
psql $DATABASE_URL -f /tmp/release-web-v0.3.0.sql
```
