# Release Notes Generator

Generate release notes for a new web app version, update CHANGELOG.md, create git tag, and output SQL INSERT statements.

## Arguments

- `$ARGUMENTS`: Version number (e.g., `v0.3.0`)

The tag format will be `web/<version>` (e.g., `web/v0.3.0`).

## Instructions

When this skill is invoked with a version number:

### Step 1: Gather Changes

1. Find the previous web tag: `git tag -l "web/v*" --sort=-version:refname | head -1`
2. Get the commit log from the previous tag to HEAD:
   ```bash
   git log <previous-tag>..HEAD --oneline --no-merges
   ```
3. For more context, also check the diff stats:
   ```bash
   git diff <previous-tag>..HEAD --stat
   ```

### Step 2: Generate Release Content

Create release content in **Markdown format** (English only for now).

**Title** (for posts.title): `Version <version> released 🎉` (e.g., "Version v0.3.0 released 🎉")

**Content** (for posts.content) should start with `## What's new` (no h1 heading):

```markdown
## What's new

- 🎹 **Feature/Change 1** - Brief description
- 🧭 **Feature/Change 2** - Brief description
- ...
```

Guidelines for content:

- Do NOT include h1 heading in content (title is stored separately in posts.title)
- Group related changes together
- Use clear, user-friendly language (not developer jargon)
- Include links to relevant features where appropriate (e.g., `/en/features/fen-practice`)
- Keep it brief - users want to quickly understand what changed
- **Do NOT include patch-level bug fixes** - Minor fixes can overshadow new features and important updates. Focus on additions and improvements that users will notice.
- **Add emojis to items** - Each item should start with a relevant emoji (e.g., 🎹 for input features, 🧭 for navigation, ✨ for new features)

### Step 3: Review with User

Present the generated content to the user:

- Show the English version
- Ask if the content is acceptable or needs modifications
- If modifications are requested, update and present again

### Step 4: Update CHANGELOG.md

Once the user approves the content, update `apps/web/CHANGELOG.md`.

**CHANGELOG format** (Keep a Changelog style):

```markdown
# Changelog

All notable changes to the web application will be documented in this file.

## [v0.3.0] - YYYY-MM-DD

### Added

- Feature 1
- Feature 2

### Changed

- Change 1

### Fixed

- Fix 1

## [v0.2.0] - YYYY-MM-DD

...
```

If CHANGELOG.md doesn't exist, create it with the header and first entry.

### Step 5: Create Git Tag

After updating CHANGELOG.md:

1. Stage and commit the CHANGELOG.md changes:

   ```bash
   git add apps/web/CHANGELOG.md
   git commit -m "docs: update CHANGELOG for web/$ARGUMENTS"
   ```

2. Create an annotated tag:

   ```bash
   git tag -a web/$ARGUMENTS -m "Release web $ARGUMENTS"
   ```

3. Inform the user that the tag was created locally and ask if they want to push:
   - `git push origin web/$ARGUMENTS` to push the tag
   - `git push` to push the commit

### Step 6: Output SQL

Generate INSERT statement (English only) and write to a temporary file.

**File location**: `/tmp/release-web-<version>.sql` (e.g., `/tmp/release-web-v0.3.0.sql`)

**SQL Template**:

```sql
-- Release notes for web/<version>
-- Generated: <current datetime>

INSERT INTO posts (slug, title, content, category_id, locale, status, published_at)
VALUES (
  '<version>',
  'Version <version> released 🎉',
  '<English content>',
  (SELECT id FROM categories WHERE slug = 'updates'),
  'en',
  'published',
  NOW()
);
```

**Important for SQL generation**:

- Content should start with `## What's new` (no h1 heading, title is in the title field)
- Escape single quotes in content by doubling them (`'` → `''`)
- Use E'...' syntax if content contains special characters
- Do NOT add extra whitespace or indentation inside the VALUES

### Step 7: Final Output

After writing the file:

1. Display the file path to the user
2. Show a preview of the SQL content
3. Remind the user to review and execute the SQL manually

## Example Usage

```
/web-release-notes v0.3.0
```

This will:

1. Analyze changes from the previous web tag to HEAD
2. Generate English release notes
3. After user approval, update `apps/web/CHANGELOG.md`
4. Create git tag `web/v0.3.0`
5. Write SQL (English only) to `/tmp/release-web-v0.3.0.sql`
