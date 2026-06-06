#!/usr/bin/env bun
/**
 * Interactive CLI to convert figh2d capture files to HTML.
 * Uses absolute positioning from captured rects for pixel-perfect layout.
 */

import { readdir } from "node:fs/promises";
import { join, dirname } from "node:path";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";

const SCRIPT_DIR = dirname(new URL(import.meta.url).pathname);
const ROOT = join(SCRIPT_DIR, "..");

console.log("");
console.log(`${CYAN}${BOLD}  figh2d → HTML Renderer${RESET}`);
console.log(`${DIM}  Convert browser capture data to a standalone HTML page${RESET}`);
console.log("");

// Find input files
const scriptFiles = await readdir(SCRIPT_DIR);
const htmlFiles = scriptFiles.filter(
  (f) => f.endsWith(".html") && !f.includes("-rendered")
);
const rootFiles = await readdir(ROOT);
const rootHtmlFiles = rootFiles.filter(
  (f) => f.endsWith(".html") && !f.startsWith("_") && !f.startsWith("index") && f !== "output.html"
);

interface FileOption { label: string; path: string }
const options: FileOption[] = [];

for (const f of htmlFiles) {
  const size = (await Bun.file(join(SCRIPT_DIR, f)).size) / 1024;
  if (size > 50) options.push({ label: `scripts/${f} (${size.toFixed(0)}KB)`, path: join(SCRIPT_DIR, f) });
}
for (const f of rootHtmlFiles) {
  const size = (await Bun.file(join(ROOT, f)).size) / 1024;
  if (size > 50) options.push({ label: `${f} (${size.toFixed(0)}KB)`, path: join(ROOT, f) });
}

if (options.length === 0) {
  console.log(`${YELLOW}  No capture files found.${RESET}`);
  process.exit(0);
}

const selected = await select("Select input file:", options.map((o) => o.label));
const input = options[selected]!;
console.log(`${GREEN}  ✓${RESET} Selected: ${input.label}`);

const inputBasename = input.path.split("/").pop()!.replace(".html", "");
const outputPath = join(SCRIPT_DIR, `${inputBasename}-rendered.html`);

console.log(`${CYAN}  │${RESET} Converting...`);

// ─── Parse figh2d ───────────────────────────────

const rawHtml = await Bun.file(input.path).text();
const s1 = rawHtml.indexOf("figh2d)");
const s2 = rawHtml.indexOf("(/figh2d)", s1);
if (s1 === -1 || s2 === -1) {
  console.log(`${YELLOW}  ✗ No figh2d payload found.${RESET}`);
  process.exit(1);
}

const b64 = rawHtml.slice(s1 + 7, s2);
const data = JSON.parse(Buffer.from(b64, "base64").toString());

console.log(`${CYAN}  │${RESET} Title: ${data.documentTitle}`);
console.log(`${CYAN}  │${RESET} Size: ${data.documentRect.width}x${data.documentRect.height}`);
console.log(`${CYAN}  │${RESET} Assets: ${Object.keys(data.assets).length}`);

// Build asset map
const assetMap = new Map<string, string>();
for (const [url, asset] of Object.entries(data.assets) as [string, any][]) {
  if (asset.blob?.base64Blob) {
    const b64Data: string = asset.blob.base64Blob;
    if (b64Data.startsWith("data:")) {
      const rawB64 = b64Data.split(",")[1] || "";
      assetMap.set(url, `data:${asset.blob.type};base64,${rawB64}`);
    }
  }
}

// ─── Renderer: absolute positioning from rects ──

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "IFRAME", "PLASMO-CSUI", "VIDEO", "CANVAS"]);
const SKIP_IDS = new Set(["__figma_capture_toolbar_host__", "plasmo-shadow-container", "jobright-helper-plugin", "dsc-toolbar"]);

// Visual styles to preserve (not layout — layout comes from rects)
const VISUAL_PROPS = new Set([
  "backgroundColor", "backgroundImage", "backgroundSize", "backgroundPosition", "backgroundRepeat",
  "color", "fontFamily", "fontSize", "fontWeight", "fontStyle",
  "lineHeight", "letterSpacing", "textAlign", "textTransform", "textDecoration", "textDecorationLine", "textDecorationColor",
  "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth",
  "borderTopStyle", "borderRightStyle", "borderBottomStyle", "borderLeftStyle",
  "borderTopColor", "borderRightColor", "borderBottomColor", "borderLeftColor",
  "borderTopLeftRadius", "borderTopRightRadius", "borderBottomLeftRadius", "borderBottomRightRadius",
  "boxShadow", "opacity", "backdropFilter", "filter",
  "overflow", "overflowX", "overflowY",
  "whiteSpace", "wordBreak", "listStyleType",
  // Text/content alignment within positioned boxes
  "display", "alignItems", "justifyContent",
]);

// Body styles for inheritance
let bodyFont = "";
let bodyColor = "";

function renderNode(node: any, parentX: number, parentY: number, depth: number, parentStyles?: any): string {
  if (depth > 60) return "";

  // Text node
  if (node.nodeType === 3) {
    const text = (node.text || "").trim();
    if (!text) return "";
    const rect = node.rect;
    // If the text node has a valid rect, position it absolutely
    // This handles cases where text sits alongside SVGs or other absolute elements
    if (rect && rect.width > 0 && rect.height > 0) {
      const tx = rect.x - parentX;
      const ty = rect.y - parentY;
      return `<span style="position: absolute; left: ${tx}px; top: ${ty}px; width: ${rect.width}px">${esc(text)}</span>`;
    }
    return esc(text);
  }

  if (node.nodeType !== 1) return "";

  const tag = node.tag || "DIV";
  const styles = node.styles || {};
  const rect = node.rect;

  // Skip unwanted
  if (SKIP_TAGS.has(tag)) return "";
  if (node.attributes?.id && SKIP_IDS.has(node.attributes.id)) return "";
  if (styles.display === "none") return "";
  if (styles.visibility === "hidden") return "";

  // Skip zero-size elements
  if (rect && rect.width === 0 && rect.height === 0) return "";

  // Skip offscreen elements
  if (rect && rect.x < -1000) return "";

  // For HTML/BODY — recurse without positioning
  if (tag === "HTML" || tag === "BODY") {
    if (tag === "BODY") {
      bodyFont = styles.fontFamily || "";
      bodyColor = styles.color || "";
    }
    return (node.childNodes || []).map((c: any) => renderNode(c, 0, 0, depth + 1, styles)).join("");
  }

  if (!rect) return "";

  // Calculate position relative to parent
  const x = rect.x - parentX;
  const y = rect.y - parentY;
  const w = rect.cssWidth || rect.width;
  const h = rect.cssHeight || rect.height;

  // Build visual styles — always use absolute positioning from rects
  const cssProps: string[] = [];
  cssProps.push(`position: absolute`);
  cssProps.push(`left: ${x}px`);
  cssProps.push(`top: ${y}px`);
  cssProps.push(`width: ${w}px`);
  cssProps.push(`height: ${h}px`);

  for (const [prop, value] of Object.entries(styles) as [string, string][]) {
    if (!VISUAL_PROPS.has(prop)) continue;

    // Skip defaults
    if (value === "rgba(0, 0, 0, 0)" && prop === "backgroundColor") continue;
    if (value === "none" && ["backgroundImage", "boxShadow", "filter", "backdropFilter", "textDecorationLine"].includes(prop)) continue;
    if (value === "1" && prop === "opacity") continue;
    if (value === "visible" && ["overflow", "overflowX", "overflowY"].includes(prop)) continue;
    if (value === "0px" && prop.startsWith("border") && prop.endsWith("Width")) continue;
    if (value === "none" && prop.startsWith("border") && prop.endsWith("Style")) continue;
    if (value === "0px" && prop.startsWith("border") && prop.endsWith("Radius")) continue;
    if (value === "start" && prop === "textAlign") continue;
    if (value === "normal" && ["letterSpacing", "lineHeight", "whiteSpace"].includes(prop)) continue;
    if (prop === "fontFamily" && value === bodyFont) continue;
    if (prop === "color" && value === bodyColor) continue;
    if (value === "disc" && prop === "listStyleType") continue;

    const kebab = prop.replace(/([A-Z])/g, "-$1").toLowerCase();
    cssProps.push(`${kebab}: ${value}`);
  }

  const style = cssProps.join("; ");

  // Handle images
  if (tag === "IMG") {
    const src = assetMap.get(node.attributes?.currentSrc || "") || node.attributes?.currentSrc || node.attributes?.src || "";
    return `<img src="${esc(src)}" alt="${esc(node.attributes?.alt || "")}" style="${style}; object-fit: cover" />`;
  }

  // Handle SVG — render the captured outerHTML content
  if (tag === "SVG") {
    if (node.content) {
      // Apply SVG-specific styles (filter, opacity) to the wrapper
      let svgExtra = "";
      if (styles.filter && styles.filter !== "none") svgExtra += `; filter: ${styles.filter}`;
      if (styles.opacity && styles.opacity !== "1") svgExtra += `; opacity: ${styles.opacity}`;
      return `<div style="${style}; overflow: hidden${svgExtra}">${node.content}</div>`;
    }
    return `<div style="${style}"></div>`;
  }

  // Render all children (both text and element nodes), passing current styles as parent context
  const childHtml = (node.childNodes || [])
    .map((c: any) => renderNode(c, rect.x, rect.y, depth + 1, styles))
    .join("");

  const lTag = tag.toLowerCase();
  let attrs = `style="${style}"`;
  if (node.attributes?.href) {
    attrs += ` href="${esc(node.attributes.href)}"`;
  }

  return `<${lTag} ${attrs}>${childHtml}</${lTag}>`;
}

function esc(t: string): string {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ─── Build page ─────────────────────────────────

const bodyNode = data.root.childNodes?.find((n: any) => n.tag === "BODY");
const primaryFont = bodyNode?.styles?.fontFamily || "system-ui, sans-serif";
const bgColor = bodyNode?.styles?.backgroundColor || "rgb(255, 255, 255)";
const textColor = bodyNode?.styles?.color || "rgb(0, 0, 0)";
const pageW = data.documentRect.width;
const pageH = data.documentRect.height;

const contentHtml = renderNode(bodyNode || data.root, 0, 0, 0);

const output = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(data.documentTitle)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: ${primaryFont};
      color: ${textColor};
      background-color: ${bgColor};
      -webkit-font-smoothing: antialiased;
    }
    .page {
      position: relative;
      width: ${pageW}px;
      height: ${pageH}px;
      margin: 0 auto;
      overflow: hidden;
    }
    img { display: block; }
    a { color: inherit; text-decoration: inherit; }
  </style>
</head>
<body>
  <div class="page">
${contentHtml}
  </div>
</body>
</html>`;

await Bun.write(outputPath, output);
console.log(`${GREEN}  ✓${RESET} Saved: ${outputPath} (${(output.length / 1024).toFixed(0)}KB)`);
console.log(`${DIM}  Open in a browser to preview.${RESET}`);
console.log("");

// ─── Arrow key selector ─────────────────────────

async function select(question: string, opts: string[]): Promise<number> {
  if (opts.length === 0) return -1;
  const canRaw = process.stdin.isTTY && typeof process.stdin.setRawMode === "function";

  if (!canRaw) {
    console.log(`  ${CYAN}?${RESET} ${question}`);
    for (let i = 0; i < opts.length; i++) console.log(`  ${DIM}${i + 1})${RESET} ${opts[i]}`);
    while (true) {
      const a = prompt(`  ${CYAN}>${RESET} Enter number (1-${opts.length}):`);
      const n = parseInt(a ?? "", 10);
      if (n >= 1 && n <= opts.length) return n - 1;
    }
  }

  let sel = 0;
  const render = () => {
    process.stdout.write(`\x1b[${opts.length}A`);
    for (let i = 0; i < opts.length; i++) {
      const pre = i === sel ? `${CYAN}❯${RESET} ` : `  `;
      const lbl = i === sel ? `${BOLD}${opts[i]}${RESET}` : `${DIM}${opts[i]}${RESET}`;
      process.stdout.write(`\x1b[2K  ${pre}${lbl}\n`);
    }
  };
  console.log(`  ${CYAN}?${RESET} ${question} ${DIM}(arrow keys)${RESET}`);
  for (let i = 0; i < opts.length; i++) {
    const pre = i === sel ? `${CYAN}❯${RESET} ` : `  `;
    const lbl = i === sel ? `${BOLD}${opts[i]}${RESET}` : `${DIM}${opts[i]}${RESET}`;
    console.log(`  ${pre}${lbl}`);
  }
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");
  return new Promise<number>((resolve) => {
    const onData = (key: string) => {
      if (key === "\x1b[A") { sel = (sel - 1 + opts.length) % opts.length; render(); }
      else if (key === "\x1b[B") { sel = (sel + 1) % opts.length; render(); }
      else if (key === "\r" || key === "\n") { cleanup(); resolve(sel); }
      else if (key === "\x03") { cleanup(); process.exit(0); }
    };
    const cleanup = () => { process.stdin.removeListener("data", onData); process.stdin.setRawMode(false); process.stdin.pause(); };
    process.stdin.on("data", onData);
  });
}
