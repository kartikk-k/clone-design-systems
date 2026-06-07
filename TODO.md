# TODO: Design System Clone — Next Steps

## Current State
- The `scripts/render.ts` pipeline (figh2d → HTML) works well
- `design.md` generation is manual but produces 95%+ accurate results
- The Figma capture script captures the DOM perfectly (figh2d format)
- We no longer need Figma MCP — the raw capture data is sufficient

## Tasks (in order)

### 1. Modify capture script to auto-save (no clipboard/Figma dependency)
**Goal:** Instead of copying to clipboard for Figma paste, save the figh2d data directly to a file or pass it back to the CLI.

**Approach:**
- Keep the same capture script (it serializes the DOM perfectly)
- Instead of `navigator.clipboard.writeText()`, use `window.__DSC_DATA__ = serializedData`
- Playwright can then read `window.__DSC_DATA__` and save it directly
- Remove the Figma-specific clipboard encoding (`<!--(figh2d)...-->` wrapper)
- Save raw JSON directly

**Files to modify:**
- `lib/inject-script.ts` — modify clipboard stub to store data on window
- `lib/browser.ts` — read `window.__DSC_DATA__` after capture, save to file
- Keep the floating toolbar UI (Copy Entire Screen / Copy Section)

### 2. Add floating toolbar with custom controls
**Goal:** Show a toolbar on the captured page with:
- "Capture Entire Screen" button
- "Capture Section" button (click to select an element)
- Status indicator
- Auto-close after capture

**Approach:**
- The current Figma script already HAS this toolbar (Entire screen + Select element)
- Modify it to not call Figma's capture flow, but instead:
  1. Serialize the DOM using the existing `Bt()` function
  2. Store result on `window.__DSC_DATA__`
  3. Signal Playwright via `window.__DSC_COPIED__ = true`

### 3. Rebuild CLI without Figma dependencies
**Goal:** New streamlined CLI flow:
```
1. Enter URL
2. Open Playwright browser → inject capture script → show toolbar
3. User clicks "Capture Entire Screen" or selects a section
4. Playwright reads captured data → saves as .json in .data/<site>/
5. Run render.ts pipeline → generates rendered HTML
6. Run design.md generator → produces design.md
7. Done
```

**Files to modify:**
- `index.ts` — remove Figma steps (3, 4, 5), replace with direct capture flow
- `lib/browser.ts` — return captured data instead of just waiting for copy
- Remove `lib/figma.ts` — no longer needed
- Remove `lib/processor.ts` Figma MCP section extraction — no longer needed

### 4. Generate both design.md and extracted-components.html
**Goal:** After rendering, auto-generate:
- `design.md` — using the token extraction + template approach (like OpenAI/Supabase)
- `extracted-components.html` — standalone HTML with key UI components

**Approach:**
- Port the grep-based token extraction into a TypeScript module
- Use the rendered HTML as input (not the raw figh2d)
- Template the design.md structure (same as manual ones we wrote)

### 5. Clean up unused files
- Remove `lib/figma.ts`
- Remove `lib/analyzer.ts` (old Figma MCP analyzer)
- Remove `lib/generator.ts` (old Figma MCP generator)
- Remove `lib/design-md-prompt.md` (superseded)
- Remove `lib/prompt-template.md` (can keep or move)
- Remove old processor.ts Figma MCP code

## File Structure (Target)

```
design-system-clone/
  index.ts                    # CLI entry point
  lib/
    cli.ts                    # CLI utilities (select, prompts, colors)
    browser.ts                # Playwright: open URL, inject script, capture
    inject-script.ts          # DOM serialization script (modified from Figma capture)
  scripts/
    render.ts                 # Interactive renderer (figh2d → HTML)
    screenshot.ts             # Playwright screenshot utility
    lib/
      types.ts                # figh2d types
      parser.ts               # Parse figh2d from HTML
      filters.ts              # Element skip rules
      styles.ts               # CSS style processing
      renderer.ts             # Node → HTML conversion
      template.ts             # HTML page template
      select.ts               # Arrow key selector
  .data/
    <site>/
      capture.json            # Raw figh2d data
      rendered.html           # Pixel-perfect HTML replica
      extracted-components.html  # Key UI components
      design.md               # Design system spec
```

## Priority Order
1. **Task 3** — Rebuild CLI (biggest impact, removes Figma dependency)
2. **Task 1** — Modify capture script (needed by Task 3)
3. **Task 2** — Toolbar UI (nice to have, current script already has it)
4. **Task 4** — Auto-generate design.md (manual process works for now)
5. **Task 5** — Clean up (last)
