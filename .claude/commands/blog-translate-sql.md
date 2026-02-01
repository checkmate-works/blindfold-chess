# Blog Translate SQL Generator

Translate a Japanese blog article to English and generate SQL INSERT statement.

## Arguments

- `$ARGUMENTS`: Path to the Japanese markdown file (optional, will prompt if not provided)

## Instructions

When this skill is invoked:

### Step 1: Get the Source File

1. If `$ARGUMENTS` is provided, use it as the file path
2. If not provided, ask the user for the file path

Read the markdown file content.

### Step 2: Parse the Article

1. Extract the title from the h1 heading (first `# ` line)
2. Extract the content (everything after the h1 heading)
3. Generate an appropriate slug based on the article content (use lowercase, hyphens, English words only, keep it concise)

### Step 3: Fix Typos and Errors

Review the Japanese source for typos, grammatical errors, or unclear expressions.

- Automatically fix any issues found
- Report what was fixed to the user (show before/after)
- If no issues found, mention that the source is clean

### Step 4: Translate to English

Translate the article from Japanese to English:

- Maintain the original structure and formatting
- Keep markdown syntax intact
- Preserve any links or references
- Use natural, fluent English
- Keep technical terms accurate
- Proper nouns like "Shogi" and "Go" should be capitalized
- **Add two trailing spaces at the end of each line** for markdown line breaks

### Step 5: Review with User

Present to the user:

1. **Proposed slug**: Show the generated slug
2. **Proposed title** (English): The translated h1
3. **Typo fixes**: List any corrections made to the source
4. **Translated content**: The full English translation

Ask the user to review and approve, or request modifications.

### Step 6: Generate SQL

Once approved, generate the INSERT statement.

**File location**: `/tmp/blog-<slug>.sql`

**SQL Template**:

```sql
-- Blog post: <slug>
-- Generated: <current datetime>
-- Original title (JA): <original Japanese title>

INSERT INTO posts (slug, title, content, category_id, locale, status, published_at)
VALUES (
  '<slug>',
  '<English title>',
  E'<English content>',
  '0222616a-e011-4608-bb37-177d20b17b51',
  'en',
  'published',
  NOW()
);
```

**Important for SQL generation**:

- Content should NOT include h1 heading (title is stored separately in posts.title)
- Escape single quotes by doubling them (`'` → `''`)
- Use E'...' syntax for content to handle special characters
- Escape backslashes (`\` → `\\`) when using E'' syntax

### Step 7: Final Output

After writing the file:

1. Display the file path to the user
2. Show a preview of the SQL content
3. Remind the user to review and execute the SQL manually

## Example Usage

```
/blog-translate-sql /path/to/article.md
```

or

```
/blog-translate-sql
```

(will prompt for file path)

This will:

1. Read the Japanese markdown file
2. Extract title from h1 and generate slug
3. Fix any typos and report corrections
4. Translate to English
5. Present for user review
6. After approval, write SQL to `/tmp/blog-<slug>.sql`
