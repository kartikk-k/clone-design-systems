#!/usr/bin/env bun
/**
 * Interactive CLI to convert figh2d capture files to HTML.
 * Usage: bun scripts/render.ts
 */

import { readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { parseFigH2D, buildAssetMap } from "./lib/parser.ts";
import { renderNode, type RenderContext } from "./lib/renderer.ts";
import { buildPage } from "./lib/template.ts";
import { select } from "./lib/select.ts";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";

const SCRIPT_DIR = dirname(new URL(import.meta.url).pathname);
const ROOT = join(SCRIPT_DIR, "..");

// ─── Banner ─────────────────────────────────────

console.log("");
console.log(`${CYAN}${BOLD}  figh2d → HTML Renderer${RESET}`);
console.log(`${DIM}  Convert browser capture data to a standalone HTML page${RESET}`);
console.log("");

// ─── Find input files ───────────────────────────

interface FileOption {
  label: string;
  path: string;
}

const options: FileOption[] = [];

const scriptFiles = await readdir(SCRIPT_DIR);
for (const f of scriptFiles) {
  if (!f.endsWith(".html") || f.includes("-rendered")) continue;
  const size = (await Bun.file(join(SCRIPT_DIR, f)).size) / 1024;
  if (size > 50) options.push({ label: `scripts/${f} (${size.toFixed(0)}KB)`, path: join(SCRIPT_DIR, f) });
}

const rootFiles = await readdir(ROOT);
for (const f of rootFiles) {
  if (!f.endsWith(".html") || f.startsWith("_") || f.startsWith("index") || f === "output.html") continue;
  const size = (await Bun.file(join(ROOT, f)).size) / 1024;
  if (size > 50) options.push({ label: `${f} (${size.toFixed(0)}KB)`, path: join(ROOT, f) });
}

if (options.length === 0) {
  console.log(`${YELLOW}  No capture files found.${RESET}`);
  process.exit(0);
}

// ─── Select file ────────────────────────────────

const selected = await select("Select input file:", options.map((o) => o.label));
const input = options[selected]!;
console.log(`${GREEN}  ✓${RESET} Selected: ${input.label}`);

const inputBasename = input.path.split("/").pop()!.replace(".html", "");
const outputPath = join(SCRIPT_DIR, `${inputBasename}-rendered.html`);

// ─── Parse & render ─────────────────────────────

console.log(`${CYAN}  │${RESET} Converting...`);

const rawHtml = await Bun.file(input.path).text();
const data = parseFigH2D(rawHtml);

console.log(`${CYAN}  │${RESET} Title: ${data.documentTitle}`);
console.log(`${CYAN}  │${RESET} Size: ${data.documentRect.width}x${data.documentRect.height}`);
console.log(`${CYAN}  │${RESET} Assets: ${Object.keys(data.assets).length}`);

const assetMap = buildAssetMap(data);
const bodyNode = data.root.childNodes?.find((n) => n.tag === "BODY");

const ctx: RenderContext = {
  bodyFont: bodyNode?.styles?.fontFamily || "",
  bodyColor: bodyNode?.styles?.color || "",
  assetMap,
};

const contentHtml = renderNode(bodyNode || data.root, 0, 0, 0, ctx);

const output = buildPage({
  title: data.documentTitle,
  primaryFont: bodyNode?.styles?.fontFamily || "system-ui, sans-serif",
  bgColor: bodyNode?.styles?.backgroundColor || "rgb(255, 255, 255)",
  textColor: bodyNode?.styles?.color || "rgb(0, 0, 0)",
  pageWidth: data.documentRect.width,
  pageHeight: data.documentRect.height,
  contentHtml,
});

// ─── Save ───────────────────────────────────────

await Bun.write(outputPath, output);
console.log(`${GREEN}  ✓${RESET} Saved: ${outputPath} (${(output.length / 1024).toFixed(0)}KB)`);
console.log(`${DIM}  Open in a browser to preview.${RESET}`);
console.log("");
