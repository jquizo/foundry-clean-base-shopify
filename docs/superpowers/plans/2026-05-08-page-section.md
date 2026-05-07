# Page Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `sections/page.liquid` — a fully block-based section for all `/pages/*` URLs, with breadcrumb, page content, image, and rich text blocks, plus a section-level content width toggle.

**Architecture:** Single section file using `{%- case block.type -%}` to render four block types. A `content_width` select setting sets a `--page-content-width` CSS variable inline on the section wrapper; `.page-section__inner` inherits it as `max-width`. Two locale keys are added to `en.default.json` under `sections.page`.

**Tech Stack:** Shopify Liquid, CSS custom properties (all tokens from `assets/tokens.css`), `locales/en.default.json`.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `sections/page.liquid` | Create | Markup, styles, schema for the page section |
| `locales/en.default.json` | Modify | Add breadcrumb home label and image alt fallback |

---

### Task 1: Add locale keys to en.default.json

**Files:**
- Modify: `locales/en.default.json`

- [ ] **Step 1: Add `sections.page` keys**

Locate the `"sections"` object in `locales/en.default.json`. It currently contains `"header"` and `"cart"`. Add a `"page"` key so the object reads:

```json
"sections": {
  "header": {
    "announcement": "Announcement"
  },
  "cart": {
    "title": "Your cart"
  },
  "page": {
    "breadcrumb_label": "Home",
    "image_alt_default": "Page image"
  }
},
```

- [ ] **Step 2: Verify the file is valid JSON**

Run from the repo root:
```bash
node -e "JSON.parse(require('fs').readFileSync('locales/en.default.json','utf8')); console.log('valid')"
```
Expected output: `valid`

If you see a `SyntaxError`, look for a missing comma after the previous sibling key or a mismatched brace.

---

### Task 2: Create sections/page.liquid — markup

**Files:**
- Create: `sections/page.liquid`

- [ ] **Step 1: Create the file with the Liquid logic and full HTML markup**

Create `sections/page.liquid` with this exact content:

```liquid
{%- comment -%} sections/page.liquid {%- endcomment -%}

{%- liquid
  if section.settings.content_width == 'narrow'
    assign page_max_width = 'var(--layout-text-max)'
  else
    assign page_max_width = 'var(--layout-content-max)'
  endif
-%}

<section
  class="page-section"
  data-section-id="{{ section.id }}"
  style="--page-content-width: {{ page_max_width }};"
>
  <div class="page-section__inner">

    {%- for block in section.blocks -%}
      {%- case block.type -%}

        {%- when 'page_header' -%}
          <div class="page__header" {{ block.shopify_attributes }}>
            {%- if block.settings.show_breadcrumb -%}
              <nav class="page__breadcrumb" aria-label="Breadcrumb">
                <a href="{{ routes.root_url }}" class="page__breadcrumb-link">
                  {{ 'sections.page.breadcrumb_label' | t }}
                </a>
                <span class="page__breadcrumb-separator" aria-hidden="true">/</span>
                <span class="page__breadcrumb-current" aria-current="page">{{ page.title }}</span>
              </nav>
            {%- endif -%}
            <h1 class="page__title">{{ page.title }}</h1>
          </div>

        {%- when 'page_content' -%}
          {%- if page.content != blank -%}
            <div class="page__content rte" {{ block.shopify_attributes }}>
              {{ page.content }}
            </div>
          {%- endif -%}

        {%- when 'image' -%}
          {%- if block.settings.image != blank -%}
            {%- assign image_alt = block.settings.alt | default: block.settings.image.alt -%}
            {%- if image_alt == blank -%}
              {%- assign image_alt = 'sections.page.image_alt_default' | t -%}
            {%- endif -%}
            {%- assign image_class = 'page__image ' | append: block.settings.image_width -%}
            <div class="page__image-wrapper" {{ block.shopify_attributes }}>
              {{
                block.settings.image
                | image_url: width: 1200
                | image_tag:
                  class: image_class,
                  alt: image_alt,
                  loading: 'lazy',
                  widths: '320, 560, 800, 1200'
              }}
            </div>
          {%- endif -%}

        {%- when 'rich_text' -%}
          {%- if block.settings.content != blank -%}
            <div class="page__rich-text rte" {{ block.shopify_attributes }}>
              {{ block.settings.content }}
            </div>
          {%- endif -%}

      {%- endcase -%}
    {%- endfor -%}

  </div>
</section>
```

---

### Task 3: Add {% style %} block to page.liquid

**Files:**
- Modify: `sections/page.liquid`

- [ ] **Step 1: Append the style block after the closing `</section>` tag**

Add the following immediately after `</section>`:

```liquid
{% style %}
  .page-section {
    padding-block: var(--section-padding-block);
  }

  .page-section__inner {
    max-width: var(--page-content-width);
    margin-inline: auto;
    padding-inline: var(--section-padding-inline);
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
  }

  /* ── Header ── */
  .page__breadcrumb {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-3);
  }

  .page__breadcrumb-link {
    font-size: var(--text-sm);
    color: var(--color-text-subtle);
    transition: color var(--duration-fast) var(--ease-out);
  }

  .page__breadcrumb-link:hover {
    color: var(--color-text);
  }

  .page__breadcrumb-separator,
  .page__breadcrumb-current {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  .page__title {
    font-size: var(--text-3xl);
    font-weight: var(--font-weight-bold);
    line-height: var(--leading-tight);
    letter-spacing: var(--tracking-tight);
    color: var(--color-text);
  }

  /* ── Image ── */
  .page__image-wrapper {
    display: block;
  }

  .page__image {
    display: block;
    height: auto;
    border-radius: var(--radius-md);
  }

  .page__image--small  { max-width: 320px; }
  .page__image--medium { max-width: 560px; }
  .page__image--full   { max-width: 100%; width: 100%; }
{% endstyle %}
```

---

### Task 4: Add {% schema %} block to page.liquid

**Files:**
- Modify: `sections/page.liquid`

- [ ] **Step 1: Append the schema block after `{% endstyle %}`**

Add the following immediately after `{% endstyle %}`:

```liquid
{% schema %}
{
  "name": "Page",
  "tag": "section",
  "class": "section-page",
  "settings": [
    {
      "type": "select",
      "id": "content_width",
      "label": "Content width",
      "default": "narrow",
      "options": [
        { "value": "narrow", "label": "Narrow (prose)" },
        { "value": "full",   "label": "Full width" }
      ]
    }
  ],
  "blocks": [
    {
      "type": "page_header",
      "name": "Page header",
      "limit": 1,
      "settings": [
        {
          "type": "checkbox",
          "id": "show_breadcrumb",
          "label": "Show breadcrumb",
          "default": false
        }
      ]
    },
    {
      "type": "page_content",
      "name": "Page content",
      "limit": 1,
      "settings": []
    },
    {
      "type": "image",
      "name": "Image",
      "settings": [
        {
          "type": "image_picker",
          "id": "image",
          "label": "Image"
        },
        {
          "type": "select",
          "id": "image_width",
          "label": "Image width",
          "default": "page__image--medium",
          "options": [
            { "value": "page__image--small",  "label": "Small"  },
            { "value": "page__image--medium", "label": "Medium" },
            { "value": "page__image--full",   "label": "Full"   }
          ]
        },
        {
          "type": "text",
          "id": "alt",
          "label": "Alt text",
          "info": "Describe the image for screen readers. Defaults to the image's own alt text if blank."
        }
      ]
    },
    {
      "type": "rich_text",
      "name": "Rich text",
      "settings": [
        {
          "type": "richtext",
          "id": "content",
          "label": "Content"
        }
      ]
    }
  ],
  "presets": [
    {
      "name": "Page",
      "blocks": [
        { "type": "page_header" },
        { "type": "page_content" },
        { "type": "image" },
        { "type": "rich_text" }
      ]
    }
  ]
}
{% endschema %}
```

- [ ] **Step 2: Verify schema JSON is well-formed**

Visually check the JSON inside the `{% schema %}` tags:
- Every `{` has a matching `}`
- Every `[` has a matching `]`
- No trailing comma before `}` or `]`
- All string values use double quotes

---

### Task 5: Commit and push

**Files:**
- `sections/page.liquid`
- `locales/en.default.json`

- [ ] **Step 1: Stage and commit**

```bash
git add sections/page.liquid locales/en.default.json
git commit -m "Add block-based page section with header, content, image, and rich text blocks."
```

- [ ] **Step 2: Push to GitHub**

```bash
git push origin main
```
