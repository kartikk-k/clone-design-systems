# Design System Instructions

You have been given a `components.html` file. This file IS the design system — it contains every UI component, color, spacing value, and pattern extracted from the original website. **Use it as the single source of truth.**

---

## How to Use This File

### 1. Finding Components
Before creating ANY UI element, search the components file first:
- Need a button? Find the button section — copy the exact classes.
- Need a card? Find the card section — copy the exact structure.
- Need a form input? Find the input section — copy the exact styling.
- **If the component exists in the file, use it EXACTLY as-is.** Do not modify colors, spacing, border-radius, or font sizes.

### 2. Creating New Components
If a component does NOT exist in the file:
- **Use the same color palette.** Extract the background, text, and border colors from existing components.
- **Use the same spacing scale.** Look at padding/gap/margin values used across components (e.g., if cards use `p-3.5 gap-4`, new cards should too).
- **Use the same border-radius values.** If buttons use `rounded-md` and cards use `rounded-xl`, follow that pattern.
- **Use the same font sizes.** If body text is `text-[13px]` and headings are `text-[22px]`, stay within that scale.
- **NEVER invent a new color.** If you need a shade that isn't in the palette, use the closest existing one.

### 3. When Given Screenshots or Images
- **The components file overrides any screenshot.** If a screenshot shows a purple gradient button but the components file has solid-color buttons, use solid-color.
- **Do NOT take design inspiration from screenshots.** Screenshots are for layout reference only (what goes where). The components file defines how things look.
- **If a screenshot shows a component that isn't in the components file,** build it using the existing color palette and spacing — never invent new visual styles.

---

## Strict Rules — DO NOT Break These

### Colors
- Use ONLY colors from the components file's `@theme` block or from existing component classes.
- NEVER use generic Tailwind colors (`blue-500`, `gray-200`, `purple-600`). Always use the exact values from the design system.
- NEVER add gradients unless they exist in the components file.
- NEVER use `black` or `white` directly — use the design system's background and text colors.

### Typography
- Use ONLY the font sizes found in the components file (e.g., `text-[11px]`, `text-[12px]`, `text-[13px]`, `text-[22px]`).
- Use ONLY the font weights found in the components file.
- NEVER use generic Tailwind text sizes (`text-sm`, `text-base`, `text-lg`). Use arbitrary values that match the design system.

### Spacing
- Use the spacing values from the components file. If the design uses `gap-4`, `p-3.5`, `px-2`, stick to those.
- NEVER use spacing values that don't appear in any component.

### Border Radius
- Copy the exact border-radius from matching components.
- If buttons use `rounded-md`, all buttons use `rounded-md`. If cards use `rounded-xl`, all cards use `rounded-xl`.
- NEVER use `rounded-full` on an element unless the components file shows it that way.

### Icons
- Use simple SVG icons (heroicons style) unless the components file includes specific brand icons.
- Keep icons the same size as shown in the components file.
- Icon colors should match the design system's icon/text-tertiary color.

### Layout
- All pages should be responsive.
- Use the same layout patterns from the components file (e.g., sidebar width, content max-width, header height).
- Maintain consistent spacing between sections.
- Left-align content unless the components file shows center alignment.

---

## Output Quality

### Consistency
- Every page built with this design system should look like it belongs to the same product.
- If you build 5 pages, a user should not be able to tell which page was built first or last — they should all look identical in quality.

### Clean Implementation
- No inline styles — use Tailwind classes only.
- No duplicate class names.
- Semantic HTML (`<nav>`, `<main>`, `<section>`, `<header>`, `<footer>`).
- Proper `aria` attributes on interactive elements.

### Responsive Design
- All layouts should work on mobile (320px) through desktop (1440px+).
- Use Tailwind responsive prefixes (`sm:`, `md:`, `lg:`) where needed.
- Stack sidebar layouts on mobile, show side-by-side on desktop.
- Ensure touch targets are at least 44px on mobile.

---

## What NOT to Do

- ❌ Do NOT use your own design judgment — follow the components file.
- ❌ Do NOT use box-shadows unless they exist in the components file.
- ❌ Do NOT use generic Tailwind color classes — ALWAYS use exact values.
- ❌ Do NOT invent new component patterns — reuse existing ones.
- ❌ Do NOT "improve" the design — reproduce it exactly.
- ❌ Do NOT add decorative elements (dividers, ornaments, badges) unless they exist in the source.
