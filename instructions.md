# ACTION REQUIRED

You have been given rendered HTML file(s) of a website. **Do the following immediately:**

1. Read ALL the rendered HTML file(s) in this folder (files named `rendered-*.html`)
2. Analyze every inline style to extract colors, typography, components, and layout
3. Generate TWO output files and save them in THIS folder:
   - `design.md` — complete design system specification (see structure below)
   - `extracted-components.html` — standalone HTML with key UI components (see structure below)

**Do NOT ask questions. Do NOT summarize. Start generating the outputs NOW.**

---

# design.md — Required Structure

Generate this EXACT structure. Every section is mandatory.

```markdown
# Design System: [site name]

> Auto-extracted from [page title]
> Every value below is exact. Do not approximate.

## Design Language

[3-5 sentences describing the visual identity:
- Is it dark or light theme?
- What kind of typography? (geometric sans-serif, humanist, monospace, serif?)
- Spacing density? (generous/airy or compact/dense?)
- Shadow usage? (flat/minimal or elevated/layered?)
- Border-radius philosophy? (sharp/corporate, small/precise, large/friendly, pill?)
- Color temperature? (warm, cool, neutral?)
- Overall feel in one word (minimal, bold, editorial, playful, clinical, premium)]

## Dos and Don'ts

### DO

- Use the EXACT hex/rgb color values from the palette — never approximate or use Tailwind color classes
- Use the EXACT font families — copy the font-family string as-is
- Use the EXACT border-radius values — do not use rounded-md or rounded-lg
- Use the EXACT font sizes, line-heights, and letter-spacing from the type scale
- Use Tailwind arbitrary values (text-[16px], rounded-[8px], gap-[24px]) to match precisely
- Match the spacing scale values for padding, margin, and gaps
- Use the button component code as-is — just change the label text
- Reference the Section layouts for how to structure page sections

### DON'T

- Don't use generic Tailwind utilities (text-sm, rounded-lg, text-gray-500) — always use exact arbitrary values
- Don't substitute fonts unless the fallback mapping explicitly says so
- Don't invent new color shades — stick to the palette
- Don't change border-radius values — if buttons use rounded-[4px], don't use rounded-md
- Don't add shadows that aren't in the shadow list
- Don't guess spacing — use values from the spacing scale
- Don't mix design languages — if the site is minimal/flat, don't add gradients or heavy shadows
- Don't change letter-spacing or line-height — these define the typographic feel

## Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `bg-page` | `rgb(...)` | Page background |
| `bg-card` | `rgb(...)` | Card/surface background |
| `bg-surface` | `rgb(...)` | Alternate surface |
| `text-primary` | `rgb(...)` | Headings, primary body text |
| `text-secondary` | `rgb(...)` | Descriptions, supporting text |
| `text-muted` | `rgb(...)` | Labels, metadata, captions |
| `brand-accent` | `rgb(...)` | Primary CTA buttons, brand accent (if any non-gray color exists) |
| `border-default` | `rgb(...)` | Borders, dividers |
| `text-on-primary` | `rgb(...)` | Text on accent-colored backgrounds |

[Extract ALL unique rgb()/rgba() values from the HTML.
Group by usage: backgrounds, text, borders, accents.
Most frequent text color = text-primary.
Most frequent bg color = bg-page.
Non-gray colors = brand/accent.
rgba(0,0,0,0) = transparent, skip it.
Include every unique color — don't limit to top 5.]

## Typography

### Font Stack

- `[exact font-family value]` (Nx occurrences)
[List ALL unique font-family values with occurrence count]

**Font rendering note:** [Map proprietary font names to CSS fallbacks]

### Type Scale

| Level | Size | Weight | Line Height | Letter Spacing | Color | Usage |
|-------|------|--------|-------------|----------------|-------|-------|
| Display | 64px | 500 | 64px | -1.92px | rgb(...) | Hero headline |
| H1 | 48px | 500 | 55.68px | -1.44px | rgb(...) | Page title |
| H2 | 30px | 500 | 39.6px | -0.3px | rgb(...) | Section headings |
| H3 | 22px | 600 | 22.96px | -0.22px | rgb(...) | Card titles |
| Body Large | 18px | 500 | 23.76px | -0.18px | rgb(...) | Intro text |
| Body | 17px | 500 | 28px | -0.17px | rgb(...) | Default body text |
| Body Small | 14px | 500 | 19.6px | -0.14px | rgb(...) | Button labels |
| Caption | 13px | 500 | 19.68px | -0.13px | rgb(...) | Dates, metadata |

[Extract ALL font-size values. For each, find the font-weight, line-height,
letter-spacing, and color that appear WITH it. Sort by size descending.
Assign level names based on size.]

### Text Recipes

[For EACH level, provide a complete copy-paste CSS block:]

**Display (64px):**
```css
font-size: 64px;
font-weight: 500;
line-height: 64px;
letter-spacing: -1.92px;
color: rgb(255, 255, 255);
```

**H1 (48px):**
```css
font-size: 48px;
...
```

[Continue for ALL levels]

## Buttons

### Primary Button
[Description: solid background, used for main CTAs]
[Example text from the actual page]

```html
<button style="
  display: flex; align-items: center; justify-content: center;
  height: [exact]px; padding: 0 [exact]px;
  background-color: [exact rgb value];
  border: [exact border or 'none'];
  border-radius: [exact]px;
  color: [exact rgb value];
  font-size: [exact]px; font-weight: [exact];
  line-height: [exact]px; letter-spacing: [exact]px;
  cursor: pointer;
">[Actual button text from page]</button>
```

### Secondary Button
[Same complete format]

### Ghost/Text Button
[Same complete format]

### Tag/Badge (if found)
[Same complete format]

[Find ALL button-like elements: elements with background-color + border-radius + height 25-60px.
Group by visual style. Extract COMPLETE styles for each.]

## Layout System

- **Container max-width:** [exact value]px
- **Side padding:** [exact value]px
- **Section spacing:** [list common padding-top/bottom values]

### Navigation Bar
[Height, background, border, backdrop-filter]

```html
<header style="[complete styles]">
  <nav style="[complete styles]">
    <!-- Logo -->
    <!-- Nav links with styles -->
    <!-- CTA buttons with styles -->
  </nav>
</header>
```

### Card Component
```html
<div style="
  background-color: [exact];
  border: [exact];
  border-radius: [exact];
  padding: [exact];
">[card content pattern]</div>
```

### Border Radius Scale
| Value | Usage |
|-------|-------|
| [exact]px | Buttons, inputs |
| [exact]px | Cards |
| 9999px | Pills, badges |

### Shadows
[List ALL box-shadow values, or "No shadows — design is intentionally flat"]

### Dividers
```css
border-bottom: [exact width] solid [exact color];
```

### Gradients (if any)
[List ALL background-image gradient values]

## Component Patterns

### Article/List Item (if page has a list)
```html
[Complete HTML with all inline styles for one list item]
```

### CTA Section
```html
[Complete HTML for a call-to-action block]
```

### Footer
```html
[Complete HTML for footer with all styles]
```

### [Any other patterns: FAQ, testimonial, pricing card, code block, etc.]

## Page Structure Reference

```
┌──────────────────────────────────────────────┐
│ HEADER: [describe contents]                  │ [height]px
├──────────────────────────────────────────────┤
│ HERO: [describe]                             │
├──────────────────────────────────────────────┤
│ SECTION: [describe]                          │
├──────────────────────────────────────────────┤
│ FOOTER: [describe]                           │
└──────────────────────────────────────────────┘
```

Key layout principles:
- [How content is centered/constrained]
- [How sections are separated (borders, spacing, background changes)]
- [Any recurring patterns]
```

---

# extracted-components.html — Required Structure

Generate a standalone HTML file showing each UI component isolated:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Components — [site name]</title>
  <style>
    body { background: [site bg color]; color: [site text color]; font-family: [site font]; }
    .section { margin: 40px 0; padding: 20px; border: 1px dashed rgba(128,128,128,0.2); border-radius: 8px; }
    .label { font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: rgba(128,128,128,0.5); margin-bottom: 16px; font-family: system-ui; }
    button { background: none; border: none; color: inherit; font: inherit; cursor: pointer; appearance: none; }
    a { color: inherit; text-decoration: none; }
  </style>
</head>
<body>
  <div class="section">
    <div class="label">Navigation</div>
    [nav HTML with exact inline styles — laid out naturally, not absolutely positioned]
  </div>
  <div class="section">
    <div class="label">Buttons</div>
    <div style="display: flex; gap: 12px; flex-wrap: wrap;">
      [each button variant with exact styles]
    </div>
  </div>
  <div class="section">
    <div class="label">Typography Scale</div>
    [each heading level rendered with its actual styles]
  </div>
  <div class="section">
    <div class="label">Cards</div>
    [card component(s) with exact styles]
  </div>
  <div class="section">
    <div class="label">Footer</div>
    [footer HTML with exact styles]
  </div>
</body>
</html>
```

**IMPORTANT for extracted-components.html:**
- Do NOT use absolute positioning — lay components out naturally with flexbox/block
- DO keep all inline styles (colors, fonts, radii, borders, shadows)
- Components should render correctly when the file is opened in a browser

---

# How to Extract Values

### Colors
- `color: rgb(...)` → TEXT colors
- `background-color: rgb(...)` → BACKGROUND colors
- `border-*-color: rgb(...)` → BORDER colors
- Count occurrences. Most frequent = primary.
- Skip `rgba(0, 0, 0, 0)` (transparent)

### Typography
- `font-size: Xpx` → ALL unique sizes
- `font-weight: X` → note if 400 or 500 is the default
- `line-height: Xpx` → pair with font sizes
- `letter-spacing: Xpx` → pair with font sizes

### Buttons
- Elements with `background-color` + `border-radius` + height 25-60px
- Or elements with `border: Xpx solid` + `border-radius`
- Group: filled=primary, outline=secondary, no-bg=ghost

### Skip These
- `display: none`, `visibility: hidden`, `opacity: 0`
- Zero-width AND zero-height elements
- Browser extension elements
- Cookie banners
