# First-party ads & the `AdSlot` boundary

Status: **implemented** (shipped 2026-07). This is the reference for how the
site serves its own (affiliate) creatives with an AdSense fallback, how ads are
hidden from entitled viewers, and how the admin manages it all. It replaced the
old `AdSenseGuard` + bespoke in-feed native-ad wiring (`AdSenseGuard` is gone).

## Overview

Every ad — first-party or AdSense — goes through one of two sibling paths that
share the same rules:

1. **Waterfall fill** — the highest-priority active creative configured for the
   slot, else the slot's AdSense fallback. Nothing configured ⇒ AdSense shows,
   exactly as before this system existed.
2. **Entitlement hide** — ad-free viewers (active subscription OR coin
   `ad_free` grant) never see any ad, of any kind. Fail-closed: a paying user
   seeing an ad is far worse than a free user missing one, so the hide is
   component-owned and un-forgettable (see _Entitlement hide_ below).
3. **Country targeting** — a creative can target one country (e.g. an Amazon US
   affiliate) or be global; the visitor's country is resolved without making
   pages dynamic (below).
4. **Layout reservation** — the slot height is reserved at SSR so AdSense fill
   doesn't shove the page down (CLS).

Placement stays **manual**: a developer renders the slot at a UX-vetted spot
(never mid-gameplay). _Where_ an ad may appear is a per-page decision; _whether
this viewer sees ads_ and _what fills the slot_ are owned centrally.

## Concepts

### Slots

A slot is a physical placement identified by a fixed key. Slots are a bounded
set defined in code (`AD_SLOTS` in `src/lib/ads/registry.ts`) — each needs a
renderer and an AdSense fallback. Current slots:

| slot key                         | kind          | selection  | AdSense fallback                       | reserve |
| -------------------------------- | ------------- | ---------- | -------------------------------------- | ------- |
| `content-middle`                 | `banner`      | `priority` | `ADSENSE_SLOT_CONTENT_MIDDLE`          | 208px   |
| `content-bottom`                 | `banner`      | `priority` | `ADSENSE_SLOT_CONTENT_BOTTOM`          | 400px   |
| `feed-native-ad`                 | `native_card` | `rotation` | AdSense in-feed (desktop/mobile)       | ~96px   |
| `puzzle-list-native-ad`          | `native_card` | `rotation` | — (none; page keeps its bottom banner) | —       |
| `position-memory-list-native-ad` | `native_card` | `rotation` | — (same)                               | —       |

Adding a placement is a registry entry (+ a renderer/fallback for a new
_kind_); it then appears in the admin automatically.

### Kind

The render format, and the shape of the JSONB `payload`:

- **`banner`** — `{ imagePath, alt, width, height }`. Image + link.
- **`native_card`** — blends into a card feed: `{ avatarImagePath, avatarAlt,
title, description, thumbnail }`. `thumbnail` is `{ fen, imagePath?,
imageAlt? }`: a chess board (FEN) is always present as the fallback, and an
  uploaded image, when set, **overrides** the board (image wins). See
  `src/lib/ads/payload.ts` (`resolveNativeThumbnail`, which also normalizes
  legacy `{type:'board'|'image'}` payloads at read time, so no JSONB migration
  is needed).

A slot accepts exactly one kind (enforced by the registry).

### Selection

How a slot with multiple active creatives picks one (`src/lib/ads/select.ts`):

- `priority` (fixed banner slots): always the top `sort_order`.
- `rotation` (native feeds/lists): the feed rotates within a page by interleave
  index; a single fixed pick is frozen by the cache until revalidation.

## Data model

`ad_creatives` (`src/lib/db/schema/notifications.ts`) — one table, all kinds
(discriminator + JSONB, like `feed_items.data` / `moderation_actions.metadata`):

| column           | note                                                    |
| ---------------- | ------------------------------------------------------- |
| `kind`           | `banner` \| `native_card`                               |
| `slot`           | varchar; the registry (not the DB) binds slot → kind    |
| `href`           | click destination (affiliate URL)                       |
| `is_active`      | soft on/off                                             |
| `sort_order`     | priority / rotation order; set by drag-and-drop (below) |
| `target_country` | ISO-3166 alpha-2, or NULL = global                      |
| `payload`        | JSONB, kind-specific (see above)                        |

There is **no schedule** (`start_at`/`end_at` were dropped): on/off is
`is_active` alone. Ordering is `sort_order` asc.

## Rendering: two sibling paths

Both wrap the ad in `.ad-slot-wrapper` (the hide hook) and run the same
waterfall; they differ only in where the per-request country read happens.

### Fixed banner slots — `<AdSlot>` (client-resolved geo)

`src/app/[locale]/_components/AdSense/AdSlot.tsx` is the **only** sanctioned way
to render a fixed placement:

```tsx
<AdSlot slot="content-bottom" />
```

- Server gate: `if (isNoAdsScope()) return null` — honors the `(no-ads)`
  whole-page opt-out (request-cache based; does **not** force the page dynamic,
  so host pages stay static/ISR).
- Delegates to `AdSlotClient`, which SSR-renders the reserved-height
  `.ad-slot-wrapper`, then on mount:
  - skips the fetch entirely if `document.documentElement.dataset.adsHidden ===
'true'` (ad-free viewer — already CSS-hidden);
  - else `fetch('/api/ad-slot/[slot]')` — the edge route reads
    `x-vercel-ip-country`, filters the (cached) pool by country, picks by
    selection, and returns the creative or `null`;
  - `creative` → `<BannerCreative>`; `null`/error → AdSense (`<AdSenseDisplay>`)
    in prod, `<AdPlaceholder>` in local dev.

Resolving the creative client-side is what lets the ad-bearing pages stay
static/ISR (no per-request geo in the page render).

### Native feeds & lists — server-resolved

The home/topics timeline (`FeedClient`) and the puzzle / position-memory list
(`create-position-list-page`) are `force-dynamic`, so reading the geo header in
the page render is free. They call `getNativeAdCreatives(slot, country)`
(`src/lib/ads/ad.ts`), interleave a `NativeAdCard`, and fall back to the
AdSense in-feed unit (`ResponsiveAdSlot`) when no creative qualifies. The ad row
is wrapped in `.ad-slot-wrapper` and gated by `shouldShowAdsForUser`.

## Entitlement hide

One kind-agnostic mechanism, unchanged by the above:

- `shouldShowAdsForUser(userId)` = `!(hasActiveSubscription || hasActiveGrant
'ad_free')`.
- A cookie writer sets `bfc_ads_hidden=1` for entitled viewers; a no-flash
  bootstrap (`AdHideBootstrapScript`) flags `<html data-ads-hidden="true">`
  before first paint; an inline CSS rule (in `[locale]/layout.tsx`) does
  `html[data-ads-hidden='true'] .ad-slot-wrapper, .adsbygoogle { display:none }`.
- Because both render paths wrap ads in `.ad-slot-wrapper`, this single rule
  hides banners, native cards, and AdSense together.

## Country resolution

Isolated in `src/lib/ads/country.ts`:

- `getRequestCountry(headers)` reads Vercel's `x-vercel-ip-country`. In
  **non-production only**, it falls back to a `bfc_dev_country` cookie so
  country targeting is testable locally (set via the dev-only geo picker widget,
  `DevGeoPicker`, shown on ad-bearing pages in `NODE_ENV=development`).
- `creativeAllowedInCountry(target, country)`: global (null target) shows
  everywhere; a targeted creative shows only on an exact match and is withheld
  when the geo is unknown (fail-closed).

## Admin

`/admin/ads` (`src/app/admin/ads/`):

- **Slot index** — lists every registry slot with its kind and creative counts.
- **Per-slot list** (`SlotCreativeList`) — the slot's creatives, with:
  - **drag-and-drop reorder** (native HTML5 DnD, no dependency) persisted by
    `reorderAdCreatives`; `sort_order` is implicit in row position (no numeric
    field);
  - an **active toggle** switch per row (`setAdCreativeActive`, optimistic);
  - a **country filter** — pick a country to see exactly what its viewers get
    (global + that country), in order; the filtered view is read-only (a
    country-scoped projection of one global order can't be unambiguously
    reordered).
- **Per-kind forms** — `BannerCreativeForm` / `NativeCardCreativeForm` share a
  `CreativeFormShell` (href, target country via searchable `CountrySelect`,
  active). The native form has a board-FEN field (always) + an optional
  override-image uploader with a **Remove image** button, and a **live preview**
  of the rendered card in a sticky side panel.
- **Image upload/delete** — `POST`/`DELETE /api/admin/ads/[id]/image?target=…`
  (`avatar` | `thumbnail`); uploads are resized (`sharp`) and stored in the
  `ad-creatives` Supabase bucket; delete clears the reference and removes the
  object.

## File map

| Concern           | Path                                                                                |
| ----------------- | ----------------------------------------------------------------------------------- |
| Slot registry     | `src/lib/ads/registry.ts`                                                           |
| Payloads + guards | `src/lib/ads/payload.ts`                                                            |
| Pool read + views | `src/lib/ads/ad.ts` (`getActiveCreatives`, `getNativeAdCreatives`)                  |
| Selection         | `src/lib/ads/select.ts`                                                             |
| Country           | `src/lib/ads/country.ts`                                                            |
| Fixed-slot render | `src/app/[locale]/_components/AdSense/AdSlot*.tsx`, `BannerCreative.tsx`            |
| Native card       | `src/app/[locale]/_components/NativeAdCard.tsx`                                     |
| Edge resolver     | `src/app/api/ad-slot/[slot]/route.ts`                                               |
| Hide mechanism    | `src/lib/ads/ads-hidden-cookie*.ts`, `AdHideBootstrapScript.tsx`, `no-ads-scope.ts` |
| Admin             | `src/app/admin/ads/`, `src/app/api/admin/ads/[id]/image/route.ts`                   |

## Non-goals / future

- **`provider` column.** Priority (Amazon > Awin > AdSense) is expressed by
  `sort_order` + the AdSense fallback; no explicit ad-network column until
  per-network reporting is needed.
- **Per-page (vs per-slot) banner targeting.** The banner pool is per slot key,
  shared across all its placements. Finer targeting would be a "sub-slot"
  extension. (Native ads already get per-surface slots.)
- **Scoped reordering under a country filter**, and new placements (sidebar,
  etc.).
