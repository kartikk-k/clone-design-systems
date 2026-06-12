# Prompt: Generate Design System from Captured HTML

You are a design engineer. You are given captured HTML file(s) of a website (scripts stripped, all CSS inlined). Your job is to extract the COMPLETE design system and recreate it as a single Tailwind CSS file.

## CRITICAL RULES

### NEVER fabricate content
- **ONLY use text, icons, labels, and content that EXIST in the source HTML.**
- Do NOT invent card titles, descriptions, icon combinations, or badge text.
- If the source has specific cards, use EXACTLY those titles and descriptions.
- If the source has a specific SVG icon, use that exact SVG. Do NOT substitute other icons.
- If a component has no description in the source, do NOT add one.

### Extract the EXACT design, not your interpretation
- Copy the structure FROM the source — exact number of items, exact text, exact arrangement.
- If the source uses custom icon fonts, represent them with simple SVG placeholders BUT keep the same count and arrangement.
- Match exact colors, spacing, font sizes — do NOT approximate.

### Layout
- Components should use FULL WIDTH of their container (body has `p-6`).
- Left-align everything. No centering of component sections.
- No wrapper cards/borders around sections. Just a label + the component.
- Section labels: `text-[11px] uppercase tracking-wider text-white/30 mb-3`

## Output Structure

Generate a single HTML file with Tailwind CSS v4 browser CDN. The file MUST include ALL of these sections in this order:

### 1. Color Palette
Extract EVERY unique color from the source CSS. Show visual swatches.

```html
<div class="mb-10">
  <div class="text-[11px] uppercase tracking-wider text-white/30 mb-3">Color Palette</div>
  <div class="mb-6">
    <div class="text-[11px] text-white/20 mb-2">Backgrounds</div>
    <div class="flex gap-3 flex-wrap">
      <!-- For each background color: -->
      <div class="text-center">
        <div class="w-14 h-14 rounded-lg" style="background: [exact value]"></div>
        <span class="text-[10px] text-white/30 mt-1 block">[name]</span>
        <span class="text-[9px] text-white/20 block font-mono">[value]</span>
      </div>
    </div>
  </div>
  <!-- Repeat for: Text colors, Border colors, Accent/Brand colors, Status colors -->
</div>
```

Where to find colors:
- `<html style="...">` tag — CSS custom properties
- `<style>` blocks — `:root {}`, `.dark {}`, `[data-theme]` definitions
- Modern color functions (`lch()`, `oklch()`, `color-mix()`) — use AS-IS, do NOT convert
- Inline styles — `background-color`, `color`, `border-color` values
- **Preserve the original color space** — if the source uses `lch()`, keep `lch()`

### 2. Typography Scale
Extract EVERY unique font-size/weight/line-height combination.

```html
<div class="mb-10">
  <div class="text-[11px] uppercase tracking-wider text-white/30 mb-3">Typography</div>
  <div class="flex flex-col gap-4">
    <div>
      <span class="text-[10px] text-white/20 font-mono">Page Title — [size]/[line-height] [weight]</span>
      <p class="[exact tailwind classes]">[Sample text from source]</p>
    </div>
    <!-- Repeat for every text level -->
  </div>
</div>
```

Include: font-family, font-size, font-weight, line-height, letter-spacing, font-feature-settings if present.

### 3. Spacing Scale
Document the padding, gap, and margin values used across components.

### 4. Border Radius
Show every unique border-radius with visual examples.

### 5. Shadows
Show every unique box-shadow with visual examples.

### 6. UI Components
Extract EVERY unique UI component. For each:

**Components to extract (if they exist in the source):**

1. **Navigation / Sidebar items** — active + inactive states, exact labels
2. **Section headers / Dividers** — date groups, category labels
3. **List items** — activity, files, commits with exact metadata (stats, dates, badges)
4. **Banners / Alerts** — exact text, exact icon, dismiss pattern
5. **User profile / Account** — avatar, name, plan badge, action buttons
6. **Page header** — title, subtitle, action buttons
7. **Filter tabs / Tab bar** — exact labels, exact active/inactive styling
8. **Cards** — exact structure with exact content from source
9. **Buttons** — EVERY variant present (primary, secondary, outline, ghost, icon, pill)
10. **Form inputs** — text fields, selects, toggles, checkboxes
11. **Badges / Tags / Status indicators**
12. **Dropdowns / Context menus** — if captured
13. **Modals / Dialogs** — if captured
14. **Tooltips** — if captured
15. **Tables / Data grids** — if present
16. **Empty states** — if present
17. **Loading states** — if present
18. **Footer** — if present

### 7. Layout Patterns
Document the overall layout structure:
- Sidebar width
- Content max-width
- Header height
- Section spacing patterns

## Color Extraction Protocol

1. **First** check `<html>` tag `style` attribute for CSS custom properties
2. **Then** search `<style>` blocks for `:root`, `.dark`, `[data-theme]` definitions
3. **Then** find `lch()`, `oklch()`, `color-mix()`, `rgb()`, `rgba()` values
4. **Then** count inline `color:`, `background-color:`, `border-color:` values
5. Group by role: backgrounds, text, borders, accents, status
6. **NEVER hardcode default colors** — always extract from the actual source
7. **NEVER convert** `lch()`/`oklch()` to hex — use the original color space

## @theme Block

Define ALL extracted colors in the `@theme` block:

```css
@theme {
  /* Backgrounds */
  --color-page-bg: [exact value from source];
  --color-surface: [exact value];
  --color-elevated: [exact value];
  --color-hover: [exact value];

  /* Text */
  --color-text-primary: [exact value];
  --color-text-secondary: [exact value];
  --color-text-tertiary: [exact value];
  --color-text-muted: [exact value];

  /* Borders */
  --color-border-default: [exact value];
  --color-border-subtle: [exact value];

  /* Accent / Brand */
  --color-accent: [exact value];

  /* Status */
  --color-success: [exact value];
  --color-error: [exact value];
  --color-warning: [exact value];
}
```

## Final Checklist

Before saving the file, verify:
- [ ] Color palette section with EVERY unique color as visual swatches
- [ ] Typography section with EVERY text level as rendered samples
- [ ] Spacing and border-radius documented
- [ ] Shadows documented (or noted as "none")
- [ ] EVERY unique UI component extracted
- [ ] Zero fabricated content — every word comes from the source
- [ ] Exact icon arrangements from source
- [ ] Full width layout, no centering
- [ ] No wrapper borders around component sections
- [ ] Colors use exact values from source (no approximation, no color-space conversion)
- [ ] `@theme` block defines all color tokens
