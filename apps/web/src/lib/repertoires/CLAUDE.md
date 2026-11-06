# Kata / Repertoire (型)

This feature has **two names for one thing**, by deliberate design:

- **"Kata" (型)** — the product/brand name, borrowed from the martial-arts
  practice method (rehearsing a pre-arranged sequence). This is the ONLY
  term users ever see: every i18n message VALUE says Kata (ja: 型), across
  the /repertoires pages, the game-finish modal card, the post-game check,
  and comment threads.
- **"repertoire"** — the internal primitive. Used everywhere code speaks:
  identifiers, file/component names, i18n KEYS (`play.repertoireCheck`,
  `Repertoires`), URLs (`/repertoires`, `/games/play/repertoire`), DB tables
  (`repertoires`, `repertoire_lines` in `src/lib/db/schema/repertoires.ts`),
  and DOM ids/testids. Never surfaced to a human.

The code lives here (`src/lib/repertoires/`), in
`src/app/[locale]/(public)/repertoires/` (pages) and in
`src/app/[locale]/(public)/games/play/repertoire/` (the post-game kata check).

## Why two names

1. **Brand vs. implementation.** "Kata" is a coined analogy that could be
   rebranded; "repertoire" is the standard chess term other engineers (and
   the DB schema) already understand. Renaming copy is a message-file edit;
   renaming routes/tables is a migration.
2. **URL/SEO stability.** Routes and canonical URLs must not chase branding.

## Rules when extending

- A new **facing surface** (label, description, toast, help copy) says
  "Kata" / 「型」. Do NOT ship a user-visible string that says "repertoire"
  (レパートリー). One deliberate exception: the Terms' content enumeration
  keeps a gloss — "kata (opening repertoires)" / 型（レパートリー） — since
  legal text should not assume the reader knows the coinage.
- New **code** stays "repertoire": identifiers, files, i18n keys, params,
  routes, DB. Comments may say "kata" when explaining the brand/feature.
- The `topicType` values `'repertoire'` / `'repertoire_move'` and the
  `Repertoires` i18n namespace name are **stored/wired identifiers** —
  never rename them; map to display labels at the read layer.
- The unpublished state is stored as `repertoires.status = 'building'`; only
  its label changed (2026-08) from "In progress" / 作成中 to "Draft" / 下書き,
  once the chunk lifecycle stopped using that word. Publish is one-way and
  lives in two places, deliberately mirroring chunks: the detail page's "⋯"
  menu (`RepertoireLifecycleControls`) and the edit form's "keep as a draft"
  checkbox.
