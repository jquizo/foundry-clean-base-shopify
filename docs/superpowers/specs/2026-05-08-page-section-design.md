# Design: sections/page.liquid

**Date:** 2026-05-08
**Status:** Approved

---

## Goal

Create `sections/page.liquid` — the main section for all `/pages/*` URLs (About, Contact, Policies, etc.). Follows the fully block-based pattern established by `sections/product.liquid` and `sections/cart.liquid`.

---

## Section-level setting

| ID | Type | Default | Purpose |
|---|---|---|---|
| `content_width` | select | `"narrow"` | Controls max-width of all content. `"narrow"` = `--layout-text-max` (680px). `"full"` = `--layout-content-max` (1280px). |

The setting sets a CSS variable (`--page-content-width`) on the section wrapper, inherited by all blocks.

---

## Blocks

### `page_header` (limit: 1)
Renders the page title and an optional breadcrumb.

| Setting ID | Type | Default | Purpose |
|---|---|---|---|
| `show_breadcrumb` | checkbox | `false` | Renders "Home → Page title" above the `<h1>` |

- Title: `page.title` wrapped in `<h1 class="page__title">`
- Breadcrumb: Home link (`routes.root_url`) + separator + current page title, marked up as `<nav aria-label="breadcrumb">`

### `page_content` (limit: 1)
Renders `page.content` (Shopify rich text editor output).

- No settings — content comes entirely from `page.content`
- Wrapped in `<div class="page__content rte">` — `.rte` is already fully styled in `base.css`

### `image` (no limit)
A merchant-uploaded image, useful for team photos, banners, maps, etc.

| Setting ID | Type | Default | Purpose |
|---|---|---|---|
| `image` | image_picker | — | The image to display |
| `image_width` | select | `"page__image--medium"` | `"page__image--small"` (~320px) / `"page__image--medium"` (~560px) / `"page__image--full"` (content-width) — values are CSS modifier class names applied directly to the `<img>` |
| `alt` | text | blank | Optional alt text override; falls back to `image.alt` |

### `rich_text` (no limit)
Freeform richtext block for callouts, supplementary copy, or anything outside `page.content`.

| Setting ID | Type | Default | Purpose |
|---|---|---|---|
| `content` | richtext | — | Merchant-authored content |

- Wrapped in `<div class="page__rich-text rte">` — reuses `.rte` styling

---

## Preset

The schema preset includes all four blocks in default reading order:

```
page_header → page_content → image → rich_text
```

This means a newly added page section renders correctly without manual block setup.

---

## CSS

All styles go in a `{% style %}` block (section-scoped, consistent with all other Foundry sections). Tokens used are all from `assets/tokens.css` — no new tokens needed.

Key rules:
- `.page-section` — `padding-block: var(--section-padding-block)`
- `.page-section__inner` — `max-width: var(--page-content-width); margin-inline: auto; padding-inline: var(--section-padding-inline)`
- `.page__title` — uses `--text-3xl`, `--font-weight-bold`, `--leading-tight`
- `.page__breadcrumb` — small, muted, uses `--text-sm`, `--color-text-muted`
- `.page__breadcrumb-separator` — `aria-hidden="true"`, `margin-inline: var(--space-2)`
- `.page__image` — `border-radius: var(--radius-md)`, `width: 100%`, `height: auto`; width variants via modifier classes
- `.page__image--small` — `max-width: 320px`
- `.page__image--medium` — `max-width: 560px`
- `.page__image--full` — `max-width: 100%`

---

## Locale keys

Two new keys added to `locales/en.default.json` under `sections.page`:

```json
"sections": {
  "page": {
    "breadcrumb_label": "Home",
    "image_alt_default": "Page image"
  }
}
```

---

## Files changed

| File | Change |
|---|---|
| `sections/page.liquid` | New file |
| `locales/en.default.json` | Add `sections.page.breadcrumb_label` and `sections.page.image_alt_default` |

---

## Out of scope

- `templates/page.json` — separate task, not part of this spec
- Mobile-specific layout variations beyond responsive max-width
- Animation / scroll effects
