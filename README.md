# Foundry

A clean, minimal Shopify base theme built from scratch. Designed to be reused across projects — branch off `main` for each new client.

---

## Tech Stack

- Shopify Liquid
- Vanilla CSS with custom properties (no frameworks)
- Vanilla JavaScript (no frameworks)
- Shopify CLI

## Architecture

### CSS
| File | Purpose |
|------|---------|
| `assets/tokens.css` | All design tokens as CSS custom properties |
| `assets/base.css` | Reset, base element styles, utility classes |
| Section `{% style %}` blocks | Component-scoped styles, co-located with markup |

### JavaScript
| File | Purpose |
|------|---------|
| `assets/theme.js` | Pub/sub, Web Components (`FoundryDisclosure`, `ProductForm`), cart helpers |

### Conventions
- BEM naming
- `{%- -%}` whitespace stripping on all Liquid tags
- `{% render %}` over `{% include %}` for snippets
- All UI strings in `locales/en.default.json` via the `| t` filter

---

## Getting Started

### Prerequisites
- Node.js
- Shopify CLI: `npm install -g @shopify/cli @shopify/theme`

### Dev server
```bash
shopify auth login
shopify theme dev
```

---

## Starting a Client Project

Branch off `main` to keep the base theme clean:

```bash
git checkout -b client-name
```

---

## Build Status

### Complete
- [x] `layout/theme.liquid`
- [x] `assets/tokens.css`
- [x] `assets/base.css`
- [x] `assets/theme.js` — pub/sub, `FoundryDisclosure`, `ProductForm`, cart helpers
- [x] `config/settings_schema.json`
- [x] `config/settings_data.json`
- [x] `locales/en.default.json`
- [x] `.shopifyignore`
- [x] `sections/header.liquid`
- [x] `sections/footer.liquid`
- [x] `sections/announcement-bar.liquid`
- [x] `sections/hero.liquid`
- [x] `sections/featured-collection.liquid`
- [x] `sections/collections.liquid`
- [x] `sections/product.liquid`
- [x] `sections/cart.liquid`
- [x] `sections/page.liquid`
- [x] `snippets/product-card.liquid`
- [x] `templates/index.json`
- [x] `templates/collection.json`
- [x] `templates/product.json`
- [x] `templates/cart.json`
- [x] `templates/page.json`
- [x] `templates/404.liquid`
- [x] `layout/password.liquid`

### Not yet built
- [ ] Blog / article templates and sections
- [ ] Search template and section
- [ ] Gift card template
