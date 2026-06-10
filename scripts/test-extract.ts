/**
 * Test script: Extract components from inlined HTML and verify they render correctly.
 * Usage: bun scripts/test-extract.ts /path/to/inlined.html
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";

const inputPath = process.argv[2] || "/Users/kartikkhorwal/Downloads/Automations_Cursor.html";
const outputDir = join(dirname(inputPath), "extracted-components");
mkdirSync(outputDir, { recursive: true });

const html = readFileSync(inputPath, "utf-8");
console.log("Input:", (html.length / 1024 / 1024).toFixed(1) + "MB");

// Strip scripts
const noScripts = html.replace(/<script[\s\S]*?<\/script>/gi, "");

// Collect all CSS
const allCSS: string[] = [];
let match: RegExpExecArray | null;
const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
while ((match = styleRegex.exec(noScripts)) !== null) allCSS.push(match[1]!);
const combinedCSS = allCSS.join("\n");

// Extract html/body attrs
const htmlAttrs = noScripts.match(/<html([^>]*)>/i)?.[1] || "";
const bodyAttrs = noScripts.match(/<body([^>]*)>/i)?.[1] || "";
const bodyMatch = noScripts.match(/<body[^>]*>([\s\S]*)<\/body>/i);
const body = bodyMatch?.[1] || "";

console.log("CSS:", (combinedCSS.length / 1024).toFixed(0) + "KB, Body:", (body.length / 1024).toFixed(0) + "KB");

// --- Extract components by class name ---

function extractByClass(className: string, source: string): string[] {
  const results: string[] = [];
  let searchFrom = 0;

  while (searchFrom < source.length) {
    // Find opening tag with this class
    const classIdx = source.indexOf(className, searchFrom);
    if (classIdx === -1) break;

    // Walk back to find the opening < of this tag
    let tagStart = classIdx;
    while (tagStart > 0 && source[tagStart] !== "<") tagStart--;

    // Get the tag name
    const tagNameMatch = source.substring(tagStart).match(/^<([a-z][a-z0-9-]*)/i);
    if (!tagNameMatch) { searchFrom = classIdx + 1; continue; }
    const tagName = tagNameMatch[1]!;

    // Find matching close tag by counting depth
    let depth = 0;
    let i = tagStart;
    const openTag = `<${tagName}`;
    const closeTag = `</${tagName}`;

    while (i < source.length) {
      if (source.substring(i, i + openTag.length).toLowerCase() === openTag.toLowerCase() && /[\s>]/.test(source[i + openTag.length] || "")) {
        depth++;
        i += openTag.length;
      } else if (source.substring(i, i + closeTag.length + 1).toLowerCase() === (closeTag + ">").toLowerCase()) {
        depth--;
        if (depth === 0) {
          results.push(source.substring(tagStart, i + closeTag.length + 1));
          break;
        }
        i += closeTag.length + 1;
      } else {
        i++;
      }
    }

    searchFrom = classIdx + className.length;
  }

  return results;
}

// Components to extract
const componentDefs = [
  { name: "template-card", class: "automations-template-card", max: 4 },
  { name: "ui-button", class: "ui-button", max: 4 },
  { name: "ui-tab", class: "ui-tab\"", max: 5 },  // exact match with closing quote
  { name: "automations-gallery", class: "automations-template-gallery\"", max: 1 },
  { name: "sidebar-nav", class: "automations-page__sidebar", max: 1 },
];

interface Component {
  name: string;
  html: string;
}

const components: Component[] = [];

for (const def of componentDefs) {
  const found = extractByClass(def.class, body);
  const unique = found.slice(0, def.max);
  for (let i = 0; i < unique.length; i++) {
    const name = unique.length > 1 ? `${def.name}-${i + 1}` : def.name;
    components.push({ name, html: unique[i]! });
    console.log(`  ${name}: ${(unique[i]!.length / 1024).toFixed(1)}KB`);
  }
}

// --- Generate output files ---

function wrap(name: string, content: string): string {
  return `<!DOCTYPE html>
<html ${htmlAttrs}>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name}</title>
  <style>${combinedCSS}</style>
</head>
<body ${bodyAttrs}>
  <div style="padding: 24px; max-width: 800px;">
    ${content}
  </div>
</body>
</html>`;
}

// Individual files
for (const c of components) {
  writeFileSync(join(outputDir, `${c.name}.html`), wrap(c.name, c.html));
}

// Combined view
const combinedContent = components.map((c) => `
  <div style="margin: 32px 0; padding: 24px; border: 1px dashed rgba(255,255,255,0.08); border-radius: 12px;">
    <div style="color: #555; font-family: system-ui; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px;">${c.name}</div>
    ${c.html}
  </div>
`).join("\n");

writeFileSync(join(outputDir, "all-components.html"), wrap("All Components", combinedContent));

// Clean full page
writeFileSync(join(outputDir, "clean-full-page.html"), `<!DOCTYPE html>
<html ${htmlAttrs}>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Clean Page</title><style>${combinedCSS}</style></head>
<body ${bodyAttrs}>${body}</body></html>`);

console.log("\n=== Open in browser to verify: ===");
console.log(`file://${join(outputDir, "all-components.html")}`);
for (const c of components) {
  console.log(`file://${join(outputDir, `${c.name}.html`)}`);
}
