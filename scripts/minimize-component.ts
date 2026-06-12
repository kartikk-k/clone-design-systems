/**
 * minimize-component.ts
 *
 * Takes a working component HTML file (with full CSS) and eliminates
 * all CSS rules that don't apply to any element in the component.
 *
 * Approach: parse the component body HTML, collect every class, tag, id,
 * and data-attribute. Then walk every CSS rule and check if its selector
 * could match any element in the component. Drop rules that can't match.
 *
 * Usage: bun scripts/minimize-component.ts <input.html> [output.html]
 */

import { readFileSync, writeFileSync } from "node:fs";

const inputPath = process.argv[2] || "/Users/kartikkhorwal/Downloads/extracted-components/card-security.html";
const outputPath = process.argv[3] || inputPath.replace(".html", "-min.html");

const html = readFileSync(inputPath, "utf-8");

// Extract the <style> content and body content
const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/);
const fullCSS = styleMatch ? styleMatch[1]! : "";
const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
const bodyHtml = bodyMatch ? bodyMatch[1]! : "";
const htmlTag = html.match(/<html[^>]*>/i)?.[0] || "<html>";
const bodyTag = html.match(/<body[^>]*>/i)?.[0] || "<body>";
const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
const title = titleMatch ? titleMatch[1]! : "Component";

console.log("Input CSS:", (fullCSS.length / 1024).toFixed(0) + "KB");
console.log("Body HTML:", bodyHtml.length, "chars");

// Step 1: Collect ALL selectors present in the component body
const usedClasses = new Set<string>();
const usedTags = new Set<string>();
const usedIds = new Set<string>();
const usedDataAttrs = new Set<string>();

// Classes
const classRegex = /class="([^"]*)"/gi;
let m: RegExpExecArray | null;
while ((m = classRegex.exec(bodyHtml)) !== null) {
  m[1]!.split(/\s+/).filter(Boolean).forEach((c) => usedClasses.add(c));
}

// Also add classes from <html> and <body> tags
const htmlClassMatch = htmlTag.match(/class="([^"]*)"/i);
if (htmlClassMatch) htmlClassMatch[1]!.split(/\s+/).filter(Boolean).forEach((c) => usedClasses.add(c));
const bodyClassMatch = bodyTag.match(/class="([^"]*)"/i);
if (bodyClassMatch) bodyClassMatch[1]!.split(/\s+/).filter(Boolean).forEach((c) => usedClasses.add(c));

// Tags
const tagRegex = /<([a-z][a-z0-9-]*)\b/gi;
while ((m = tagRegex.exec(bodyHtml)) !== null) usedTags.add(m[1]!.toLowerCase());
usedTags.add("html");
usedTags.add("body");

// IDs
const idRegex = /id="([^"]*)"/gi;
while ((m = idRegex.exec(bodyHtml)) !== null) usedIds.add(m[1]!);

// Data attributes
const dataRegex = /data-([a-z-]+)(?:="([^"]*)")?/gi;
while ((m = dataRegex.exec(bodyHtml)) !== null) usedDataAttrs.add(`data-${m[1]}`);

console.log("Used classes:", usedClasses.size);
console.log("Used tags:", usedTags.size);
console.log("Used data-attrs:", usedDataAttrs.size);

// Step 2: Check if a CSS selector could match anything in our component
function selectorMatches(selector: string): boolean {
  // Always keep :root, *, html, body
  const trimmed = selector.trim();
  if (/^(\*|:root|html|body)(\s|,|{|$|:|\[)/.test(trimmed)) return true;
  if (trimmed === "*" || trimmed === ":root") return true;

  // Check if ANY class from the component appears in the selector
  for (const cls of usedClasses) {
    // Match .classname followed by non-alphanumeric (not a substring of longer class)
    if (selector.includes("." + cls)) {
      // Verify it's not a substring match
      const idx = selector.indexOf("." + cls);
      const afterChar = selector[idx + cls.length + 1] || "";
      if (/[^a-zA-Z0-9_-]/.test(afterChar) || afterChar === "") return true;
    }
  }

  // Check tag names — but only if no class restriction
  // (e.g. "button" matches, "div.some-other-class" doesn't)
  for (const tag of usedTags) {
    const tagPattern = new RegExp(`(^|[\\s>+~,])${tag}([\\s>+~,.:{[\\]$])`, "i");
    if (tagPattern.test(" " + selector + " ")) {
      // Check if this selector ALSO has a class we DON'T have
      const selectorClasses = selector.match(/\.([a-zA-Z0-9_-]+)/g);
      if (!selectorClasses) return true; // No class restriction — tag-only selector
      // Has class restriction — check if we have ALL classes
      const allMatch = selectorClasses.every((cls) => usedClasses.has(cls.substring(1)));
      if (allMatch) return true;
    }
  }

  // Check data-attribute selectors
  for (const attr of usedDataAttrs) {
    if (selector.includes(`[${attr}`)) return true;
  }

  // Check :where() / :is() contents
  const whereRegex = /:(?:where|is)\(([^)]+)\)/g;
  let wm: RegExpExecArray | null;
  while ((wm = whereRegex.exec(selector)) !== null) {
    const inner = wm[1]!;
    for (const cls of usedClasses) {
      if (inner.includes("." + cls)) return true;
    }
  }

  return false;
}

// Step 3: Walk through CSS and keep only matching rules
const keptRules: string[] = [];
let droppedCount = 0;
let keptCount = 0;

// Split CSS into rules using brace counting
let i = 0;
while (i < fullCSS.length) {
  // Skip whitespace
  while (i < fullCSS.length && /\s/.test(fullCSS[i]!)) i++;
  if (i >= fullCSS.length) break;

  const start = i;

  // Handle @-rules
  if (fullCSS[i] === "@") {
    const atMatch = fullCSS.substring(i).match(/^@([a-zA-Z-]+)/);
    if (atMatch) {
      const atName = atMatch[1]!;

      // @keyframes — drop (not needed for static design)
      if (atName === "keyframes" || atName === "-webkit-keyframes") {
        let depth = 0;
        while (i < fullCSS.length) {
          if (fullCSS[i] === "{") depth++;
          if (fullCSS[i] === "}") { depth--; if (depth === 0) { i++; break; } }
          i++;
        }
        droppedCount++;
        continue;
      }

      // @font-face — keep only if font-family is used somewhere in kept rules or body
      if (atName === "font-face") {
        let depth = 0;
        const faceStart = i;
        while (i < fullCSS.length) {
          if (fullCSS[i] === "{") depth++;
          if (fullCSS[i] === "}") { depth--; if (depth === 0) { i++; break; } }
          i++;
        }
        // Keep all font-faces for now (small cost, prevents broken fonts)
        keptRules.push(fullCSS.substring(faceStart, i));
        keptCount++;
        continue;
      }

      // @media / @supports / @layer — check inner rules
      if (atName === "media" || atName === "supports" || atName === "layer") {
        const braceStart = fullCSS.indexOf("{", i);
        let depth = 1;
        let j = braceStart + 1;
        while (j < fullCSS.length && depth > 0) {
          if (fullCSS[j] === "{") depth++;
          if (fullCSS[j] === "}") depth--;
          j++;
        }

        const block = fullCSS.substring(start, j);
        // Check if ANY selector inside matches
        let hasMatch = false;
        // Quick check: does any used class appear in this block?
        for (const cls of usedClasses) {
          if (block.includes("." + cls)) { hasMatch = true; break; }
        }
        // Also check tags
        if (!hasMatch) {
          for (const tag of usedTags) {
            if (block.includes(tag + "{") || block.includes(tag + " ") || block.includes(tag + ",") || block.includes(tag + ":")) { hasMatch = true; break; }
          }
        }
        // Check :root variables
        if (block.includes(":root") || block.includes("--")) hasMatch = true;

        if (hasMatch) {
          keptRules.push(block);
          keptCount++;
        } else {
          droppedCount++;
        }
        i = j;
        continue;
      }
    }

    // Other @-rules — skip
    const semi = fullCSS.indexOf(";", i);
    if (semi !== -1) { i = semi + 1; continue; }
    i++;
    continue;
  }

  // Regular rule: selector { properties }
  const braceIdx = fullCSS.indexOf("{", i);
  if (braceIdx === -1) break;

  let depth = 1;
  let j = braceIdx + 1;
  while (j < fullCSS.length && depth > 0) {
    if (fullCSS[j] === "{") depth++;
    if (fullCSS[j] === "}") depth--;
    j++;
  }

  const rule = fullCSS.substring(start, j);
  const selector = fullCSS.substring(start, braceIdx).trim();

  if (selectorMatches(selector)) {
    keptRules.push(rule);
    keptCount++;
  } else {
    droppedCount++;
  }

  i = j;
}

console.log("\nKept:", keptCount, "rules");
console.log("Dropped:", droppedCount, "rules");

// Step 4: Collect used CSS variables and filter :root blocks
const keptCSS = keptRules.join("\n");

// Find all var(--xxx) references in kept CSS + body HTML
const usedVars = new Set<string>();
const varRefRegex = /var\(\s*(--[a-zA-Z0-9_-]+)/g;
let vm: RegExpExecArray | null;

// First pass: direct references
const searchText = keptCSS + " " + bodyHtml;
while ((vm = varRefRegex.exec(searchText)) !== null) usedVars.add(vm[1]!);

// Transitive: variables that reference other variables
let prevSize = 0;
while (usedVars.size !== prevSize) {
  prevSize = usedVars.size;
  const defRegex = /(--[a-zA-Z0-9_-]+)\s*:\s*([^;{}]+)/g;
  while ((vm = defRegex.exec(fullCSS)) !== null) {
    if (usedVars.has(vm[1]!)) {
      const innerRefs = vm[2]!.match(/var\(\s*(--[a-zA-Z0-9_-]+)/g);
      if (innerRefs) innerRefs.forEach((r) => {
        const name = r.match(/var\(\s*(--[a-zA-Z0-9_-]+)/)?.[1];
        if (name) usedVars.add(name);
      });
    }
  }
}

console.log("Used CSS variables:", usedVars.size);

// Step 5: Skip variable filtering — keep all :root blocks intact
// Variable filtering is too fragile with complex chains. The :root blocks
// are small compared to the rule bloat we already removed.
const finalCSS = keptRules.join("\n");

console.log("Final CSS:", (finalCSS.length / 1024).toFixed(1) + "KB");

// Step 6: Write output
const output = `<!DOCTYPE html>
${htmlTag}
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
${finalCSS}
  </style>
</head>
${bodyTag}
${bodyHtml}
</body>
</html>`;

writeFileSync(outputPath, output);
const lines = output.split("\n").length;
console.log(`\nOutput: ${outputPath}`);
console.log(`  ${lines} lines, ${(output.length / 1024).toFixed(1)}KB`);
console.log(`  Reduction: ${((1 - output.length / html.length) * 100).toFixed(1)}%`);
console.log(`\nfile://${outputPath}`);
