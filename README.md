# Design System Clone

Extract a website into reusable design-system artifacts. The CLI opens pages in
Playwright, serializes the rendered DOM into figh2d capture data, converts that
capture into standalone HTML, and can generate a first-pass `design.md` plus an
`extracted-components.html` component sheet.

## Requirements

- [Bun](https://bun.com)
- Chromium for Playwright

Install dependencies:

```bash
bun install
```

If Playwright has not installed a browser yet, install Chromium:

```bash
bunx playwright install chromium
```

## Quick start

Run the interactive CLI:

```bash
bun run index.ts
```

The CLI walks through:

1. Entering one or more website URLs, or resuming an existing `.data/<site>/`
   capture directory.
2. Opening Chromium and capturing each page.
3. Rendering captured figh2d data into standalone HTML.
4. Generating design-system files automatically, or copying `instructions.md`
   into the site directory for agent-assisted generation.
5. Printing a summary of generated files.

Generated files are written to:

```text
.data/<site>/
  capture-<path>.html
  rendered-<path>.html
  design.md
  extracted-components.html
  instructions.md
```

`design.md`, `extracted-components.html`, and `instructions.md` are created only
when the selected generation mode needs them.

## Utility scripts

### Capture URLs without the interactive wizard

```bash
bun run scripts/auto-capture.ts https://example.com
```

Pass multiple URLs to capture more than one page:

```bash
bun run scripts/auto-capture.ts https://example.com https://example.com/pricing
```

Chromium opens visibly by default. Add `--headless` for headless capture:

```bash
bun run scripts/auto-capture.ts https://example.com --headless
```

### Render an existing capture

```bash
bun run scripts/render.ts
```

The renderer searches for large figh2d `.html` capture files in the project root
and `scripts/`, lets you choose one, and writes a rendered HTML preview.

### Inspect capture metadata

```bash
bun run scripts/verify-capture.ts new.html
```

This prints the capture title, viewport size, asset count, serialized JSON size,
and a few quick DOM statistics.

## How it works

- `index.ts` is the main interactive workflow.
- `lib/inject-script.ts` contains the browser-side DOM serialization script.
- `scripts/lib/parser.ts` reads figh2d capture data from HTML.
- `scripts/lib/renderer.ts` converts captured nodes into HTML.
- `scripts/lib/template.ts` wraps rendered content in a standalone page.
- `scripts/lib/design-extractor.ts` and
  `scripts/lib/component-extractor.ts` generate the initial design-system
  documentation and component sheet.

The capture pipeline is designed for rendered pages, so JavaScript-heavy sites
are loaded in Chromium before the DOM is serialized.

## Notes

- The project uses Bun APIs such as `Bun.file` and `Bun.write`.
- `.data/` output is generated content and can become large.
- Some sites may block automated browsers or require manual interaction before
  capture.
