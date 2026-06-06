# Prompt Template: Build a page using a cloned design system

Use this prompt with any AI agent (Claude, ChatGPT, Cursor, etc.). Replace the placeholders with your actual content.

---

## The Prompt

```
You are building a web page for [PRODUCT_NAME]. This page must look like it was designed by the same team that built [REFERENCE_SITE] — same visual DNA, same design language, same level of polish.

## Design System Reference

I'm providing you with an extracted design system from [REFERENCE_SITE]. Follow it precisely:

[PASTE THE ENTIRE design.md CONTENT HERE]

## Critical Rules

1. **Colors**: Use ONLY the colors from the Color Palette above. Use the semantic tokens:
   - `primary` for buttons and CTAs
   - `text-heading` for headings
   - `text-body` for paragraphs
   - `text-muted` for secondary text
   - `border-subtle` for borders and dividers
   - `surface-default` / `surface-alt` for section backgrounds

2. **Typography**: Use the exact font families and type scale recipes provided. Copy the full Tailwind class strings from the "Heading & Text Recipes" section. Match the letter-spacing and line-height exactly.

3. **Buttons**: Use the exact button component code from the Buttons section. Do not invent new button styles. Match padding, border-radius, and font-size exactly.

4. **Layout**: Follow the container max-width, padding, and section spacing values from the Layout System section.

5. **Border Radius**: Use only the radius values listed. Do not use arbitrary radii.

6. **Shadows**: Use only the shadow values listed (or none if the design system has none).

7. **Spacing**: Use the spacing scale values. Prefer the most commonly used values.

8. **Section Patterns**: Reference the Section Reference for how sections are structured — their backgrounds, internal spacing, and component composition.

## What to Build

[DESCRIBE YOUR PAGE HERE — e.g., "A pricing page with 3 tiers, a FAQ section, and a CTA at the bottom"]

## Technical Requirements

- Use React + Tailwind CSS
- Single-file component
- Mobile-responsive
- Use the exact Tailwind arbitrary values from the design system (e.g., `text-[#533afd]`, `rounded-[4px]`)
- Do NOT use standard Tailwind color classes (like `text-blue-500`) — use the exact hex values from the design system
```

---

## Example: Stripe Pricing Page

```
You are building a web page for Acme Payments. This page must look like it was designed by the same team that built Stripe — same visual DNA, same design language, same level of polish.

## Design System Reference

[paste .data/stripe/design.md here]

## What to Build

A pricing page with:
- Navigation bar matching the reference nav pattern
- Hero section with headline "Simple, transparent pricing" and subtext
- 3 pricing tiers (Starter $29/mo, Growth $79/mo, Enterprise custom) as cards
- Feature comparison table below the cards
- FAQ section with 6 questions
- Bottom CTA section: "Ready to get started?"
- Footer matching the reference footer pattern

Each pricing card should have:
- Tier name, price, description
- Feature list with checkmarks
- CTA button (primary for the recommended tier, outline for others)
```

---

## Example: OpenAI Product Page

```
You are building a web page for a new AI product. This page must look like it was designed by the same team that built OpenAI — same visual DNA, same design language, same level of polish.

## Design System Reference

[paste .data/openai/design.md here]

## What to Build

A product landing page with:
- Dark navigation bar with logo and nav links
- Hero section with large headline and product demo screenshot
- 3 feature sections with icons and descriptions
- Customer logos bar
- Testimonial with quote
- CTA section with "Get Started" button
- Minimal footer
```

---

## Tips for Best Results

1. **Include the full design.md** — don't summarize it. The exact hex values and class recipes are critical.

2. **Reference specific sections** — if you want a hero like the reference, say "Structure the hero section like the Hero section in the reference."

3. **Include the JSX files** — for even more accuracy, also include the relevant `.jsx` section files. For example, if you want a nav bar, include the navigation section's `.jsx` file and say "Base the nav on this exact code, adapting the links and text."

4. **Be specific about what varies** — tell the AI what content changes (text, images) and what should stay identical (colors, typography, spacing, component patterns).

5. **Iterate** — if the first result doesn't match, point out specific discrepancies: "The button radius should be 4px not 8px" or "Use the text-muted color for the subtitle, not text-body."
