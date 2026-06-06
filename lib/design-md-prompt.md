# Prompt: Generate design.md from HTML+Tailwind

Use this prompt with any AI agent. Pass it the raw HTML file content and it will generate a structured `design.md`.

---

## Instructions

You are a design system analyst. You will be given an HTML file that uses Tailwind CSS classes. This HTML is a pixel-perfect replica of a website captured from Figma.

Analyze the HTML and extract a complete design system specification. Be extremely precise — every color, font, size, shadow, radius, and spacing value matters.

## What to extract

### 1. Colors
- Extract ALL hex colors from Tailwind classes: `text-[#xxx]`, `bg-[#xxx]`, `border-[#xxx]`, `from-[#xxx]`, `to-[#xxx]`
- Also extract named colors: `text-white`, `bg-black`, etc.
- Group by usage: text colors, background colors, border colors, accent/brand colors
- Identify the primary brand color, secondary colors, and neutral palette

### 2. Typography
- **Font families**: Extract from `font-['family-name']` classes
- **Font sizes**: Extract from `text-[Xpx]` or `text-{size}` classes — list all unique values
- **Font weights**: Extract from `font-{weight}` classes
- **Line heights**: Extract from `leading-[X]` or `leading-{name}` classes
- **Letter spacing**: Extract from `tracking-[X]` classes
- For each heading level (h1-h6), provide the exact class combination used

### 3. Buttons
- Find all button-like elements (elements with bg + rounded + padding + text)
- For each variant, provide the EXACT HTML with all Tailwind classes
- Categorize: primary, secondary, outline, ghost, link-style, icon buttons
- Note hover/active states if classes suggest them

### 4. Links
- Navigation links (in header/nav sections)
- Inline/body links
- Footer links
- CTA links (with arrows, icons)
- Provide exact class combinations for each type

### 5. Cards & Containers
- Identify card patterns (bg + rounded + shadow + padding)
- List the exact class combinations
- Note any border, shadow, or background variations

### 6. Spacing Scale
- Extract all padding values: `p-[X]`, `px-[X]`, `py-[X]`, `pt-[X]`, etc.
- Extract all margin values: `m-[X]`, `mx-[X]`, etc.
- Extract all gap values: `gap-[X]`
- Sort numerically and identify the spacing scale pattern

### 7. Border Radius
- List all `rounded-[X]` values used
- Identify which radius is used for buttons, cards, inputs, etc.

### 8. Shadows
- List all `shadow-[X]` values
- Note which components use which shadow level

### 9. Layout Patterns
- How is the page structured? (sections, containers, grids)
- What max-width is used for content containers?
- What are the section spacing patterns?

### 10. Section-by-Section Breakdown
For each major section in the HTML:
- Describe the layout pattern (hero, feature grid, testimonials, etc.)
- List the key design decisions (background color, spacing, typography choices)
- Provide the section's HTML as a code block for reference

## Output Format

Generate a Markdown file with this exact structure:

```markdown
# Design System: [Site Name]

## Colors
### Brand Colors
| Name | Value | Usage |
### Neutral Colors
| Name | Value | Usage |
### Semantic Colors
| Name | Value | Usage |

## Typography
### Font Families
### Type Scale
| Element | Size | Weight | Line Height | Letter Spacing |
### Heading Styles
(exact class combos for h1-h6)

## Buttons
### Primary Button
```html (exact code)```
### Secondary Button
### Other Variants

## Cards
(patterns with exact code)

## Spacing
(scale table)

## Border Radius
(values and usage)

## Shadows
(values and usage)

## Section Patterns
### Hero Section
### Feature Section
### Testimonials
### Footer
(etc. — for each section, describe the design pattern and provide code)
```

## Input

The HTML content follows below. Analyze it thoroughly.

---

[PASTE HTML CONTENT HERE]
