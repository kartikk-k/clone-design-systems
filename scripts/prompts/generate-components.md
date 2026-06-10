# Prompt: Generate Tailwind Components from Raw HTML

You are a design engineer. You are given the RAW BODY HTML of a website page (scripts stripped, CSS intact). Your job is to extract EVERY unique UI component visible on the page and recreate each one using clean Tailwind CSS.

## CRITICAL RULES — READ FIRST

### NEVER fabricate content
- **ONLY use text, icons, labels, and content that EXIST in the source HTML.**
- Do NOT invent card titles, descriptions, icon combinations, or badge text.
- If the source has 4 cards with "Find bugs", "Scan codebase for vulnerabilities", "Generate docs", "Add test coverage" — use EXACTLY those. Do not create "Post to Discord on PR merge" or any other card that doesn't exist.
- If the source has a Slack SVG icon, use that exact SVG. Do NOT substitute GitHub, Discord, or any other icon.
- If a banner says "Refer friends, earn up to $250" with no description underneath, do NOT add a description.

### Extract the EXACT component, not your interpretation
- Copy the structure FROM the source. If a list item has `+103 -4` as plain text-tertiary (no colors), keep it that way. Do NOT add green/red coloring.
- If the source nav uses custom icon font (`cursor-icon` class), represent icons with simple SVG placeholders BUT keep the same number and arrangement.
- Match the EXACT number of items. If there are 4 nav items, show 4. If there are 5 filter tabs, show 5.

### Layout rules
- Components should use FULL WIDTH of their container (with reasonable padding like `p-6` on body).
- Do NOT center-align component sections. Left-align everything.
- Do NOT add wrapper cards/borders around component sections. Use a simple label + the component.
- Section labels should be minimal: `text-[11px] uppercase tracking-wider text-white/30 mb-3`

## Input
- The raw body HTML of the page (provided separately)
- CSS variable definitions (provided separately)

## Output Format
```html
<!DOCTYPE html>
<html class="dark">
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
  <style type="text/tailwindcss">
    @theme {
      /* Exact color tokens from the CSS */
    }
  </style>
</head>
<body class="bg-[#141414] text-[rgba(228,228,228,0.94)] font-[system-ui,...] p-6">

  <!-- COMPONENT_NAME -->
  <div class="mb-10">
    <div class="text-[11px] uppercase tracking-wider text-white/30 mb-3">Component Name</div>
    <!-- Component HTML using Tailwind -->
  </div>

</body>
</html>
```

## What to extract
Scan the ENTIRE page body HTML. Create a component section for EVERY unique UI pattern:

1. **Sidebar nav items** — active and inactive states, exact labels from source
2. **Section headers** — "Last 7 days" type dividers with any collapse chevrons
3. **List items** — activity items, file items with exact metadata layout (stats, time)
4. **Banners** — exact text, exact icon, exact dismiss pattern from source
5. **User profile** — avatar, name, badge, action buttons as they appear
6. **Page header** — exact title text, exact button text
7. **Filter tabs** — exact labels, exact active/inactive styling (pill vs flat)
8. **Cards** — exact titles, exact descriptions, exact icon arrangements from source
9. **Buttons** — every variant that EXISTS in the source
10. **Badges/Tags** — only ones that EXIST in the source

## Design tokens to use

Colors:
- `#141414` — page bg
- `#181818` — elevated surface
- `rgba(228,228,228,0.94)` — text primary
- `rgba(228,228,228,0.70)` — text secondary
- `rgba(228,228,228,0.40)` — text tertiary
- `rgba(228,228,228,0.12)` — border default
- `rgba(228,228,228,0.06)` — hover bg / active tab bg
- `rgba(228,228,228,0.04)` — subtle border (card shadow)

Sizing:
- Nav item: `h-8 px-2 text-[13px] font-medium rounded-md`
- Button (primary): `h-7 px-2 text-[13px] font-medium rounded-md`
- Button (pill outline): `h-7 px-3 text-[13px] rounded-full border`
- Filter tab (active): `rounded-full px-2.5 py-1 text-[13px] font-medium` with bg + border
- Filter tab (inactive): no bg, no border, `text-[13px] font-medium text-tertiary`
- Card: `rounded-xl p-3.5 gap-4` with `shadow-[0_0_0_1px_rgba(228,228,228,0.04)]`
- Card title: `text-[13px] font-normal leading-[18px]`
- Card description: `text-[12px] leading-4 line-clamp-3`

## Final checklist
- [ ] Zero fabricated content — every word comes from the source
- [ ] Exact icon arrangements from source (Slack SVG where Slack exists, not GitHub/Discord)
- [ ] Full width layout, no centering
- [ ] No wrapper borders around sections
- [ ] All unique components extracted
- [ ] Colors are exact rgba values, not approximations
