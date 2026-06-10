/**
 * clean-component.ts
 *
 * Takes an extracted component HTML (from extract-with-styles.js)
 * and produces a clean, minimal version with:
 * - All CSS variables resolved to final values
 * - Only the component-specific CSS rules kept
 * - Clean HTML structure
 *
 * Usage: bun scripts/clean-component.ts <input.html> [output.html]
 */

import { readFileSync, writeFileSync } from "node:fs";

const inputPath = process.argv[2] || "/Users/kartikkhorwal/Downloads/component (7).html";
const outputPath = process.argv[3] || inputPath.replace(/\.html$/, "-clean.html");

const html = readFileSync(inputPath, "utf-8");

// Extract all CSS
const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/);
const fullCSS = styleMatch ? styleMatch[1]! : "";

// Extract body content
const bodyContent = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] || "";

// Step 1: Parse ALL CSS variable definitions
// Walk through all rules and collect --var: value pairs
const varDefs: Record<string, string> = {};

// Parse :root and similar blocks for variable definitions
const varDefRegex = /(--[a-zA-Z0-9_-]+)\s*:\s*([^;{}]+)/g;
let m: RegExpExecArray | null;
while ((m = varDefRegex.exec(fullCSS)) !== null) {
  varDefs[m[1]!] = m[2]!.trim();
}

console.log("CSS variables found:", Object.keys(varDefs).length);

// Step 2: Resolve variables transitively
// var(--a) -> var(--b) -> #fff => --a resolves to #fff
function resolveVar(value: string, depth = 0): string {
  if (depth > 20) return value;

  return value.replace(/var\(\s*(--[a-zA-Z0-9_-]+)(?:\s*,\s*([^)]+))?\s*\)/g, (match, varName, fallback) => {
    const resolved = varDefs[varName];
    if (resolved) {
      // Recursively resolve if the value contains more var() references
      return resolveVar(resolved, depth + 1);
    }
    // Use fallback if provided
    if (fallback) return resolveVar(fallback.trim(), depth + 1);
    return match; // Keep unresolved
  });
}

// Step 3: Find component-specific CSS rules (not :root/*/html/body)
const componentRules: string[] = [];
const globalResets: string[] = [];

// Split CSS into rules
const ruleRegex = /([^{}]+)\{([^}]+)\}/g;
while ((m = ruleRegex.exec(fullCSS)) !== null) {
  const selector = m[1]!.trim();
  const body = m[2]!.trim();

  // Skip :root, *, html, body — we resolve their vars inline
  if (/^(\*|:root|html|body|::before|::after)/.test(selector)) {
    // Keep basic resets
    if (selector === "*" || selector.includes("::before") || selector.includes("::after")) {
      if (body.includes("box-sizing")) {
        globalResets.push(`${selector}{${body}}`);
      }
    }
    continue;
  }

  // Skip @-rules, scrollbar, selection, focus, disabled
  if (selector.startsWith("@") || selector.includes("scrollbar") ||
      selector.includes("::selection") || selector === ":focus" ||
      selector === ":disabled" || selector.includes("html:not(")) {
    continue;
  }

  // Skip @font-face (keep separately if needed)
  // Keep component-specific rules
  if (selector.includes("automations") || selector.includes("ui-button") ||
      selector.includes("ui-icon") || selector.includes("cursor-icon")) {

    // Resolve all var() references in the body
    const resolvedBody = body.split(";").map(decl => {
      const [prop, ...valParts] = decl.split(":");
      if (!prop || valParts.length === 0) return "";
      const val = valParts.join(":").trim();
      const resolved = resolveVar(val);
      return `${prop.trim()}: ${resolved}`;
    }).filter(Boolean).join("; ");

    componentRules.push(`${selector} { ${resolvedBody}; }`);
  }
}

console.log("Component rules:", componentRules.length);

// Step 4: Extract body background/color from resolved vars
const bgChrome = resolveVar("var(--bg-chrome)");
const textPrimary = resolveVar("var(--text-primary)");
const bgThemeBg = resolveVar("var(--bg-theme-bg)") || bgChrome;

// Detect body bg from the body class or direct resolution
let bodyBg = "rgb(20, 20, 20)";
let bodyColor = "rgba(255, 255, 255, 0.94)";
let bodyFont = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

// Try to resolve from CSS
const bgEditorVar = resolveVar("var(--editor)");
if (bgEditorVar && !bgEditorVar.includes("var(")) bodyBg = bgEditorVar;
const textPrimaryResolved = resolveVar("var(--text-primary)");
if (textPrimaryResolved && !textPrimaryResolved.includes("var(")) bodyColor = textPrimaryResolved;

// Step 5: Also handle the @font-face for cursor-icons
const fontFaceMatch = fullCSS.match(/@font-face\s*\{[^}]*cursor-icons[^}]*\}/);
const fontFace = fontFaceMatch ? fontFaceMatch[0] : "";

// Step 6: Clean up the component HTML — remove unnecessary attributes
let cleanBody = bodyContent;
// Remove data-new-gr-c-s-check-loaded, data-gr-ext-installed (grammarly)
cleanBody = cleanBody.replace(/\s*data-new-gr-c-s-check-loaded="[^"]*"/g, "");
cleanBody = cleanBody.replace(/\s*data-gr-ext-installed="[^"]*"/g, "");
// Remove class from body wrapper div keeping only component
cleanBody = cleanBody.replace(/class="bg-theme-bg[^"]*"/g, "");

// Step 7: Build clean output
const output = `<!DOCTYPE html>
<html class="dark" style="color-scheme: dark;">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Component</title>
<style>
/* Reset */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background: ${bodyBg};
  color: ${bodyColor};
  font-family: ${bodyFont};
  -webkit-font-smoothing: antialiased;
}
button {
  background: none;
  border: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
}
svg { display: block; vertical-align: middle; }

/* Component */
${componentRules.join("\n")}

${fontFace ? `/* Icon font */\n${fontFace}` : ""}
</style>
</head>
<body>
${cleanBody}
</body>
</html>`;

writeFileSync(outputPath, output);
const lines = output.split("\n").length;
console.log(`\nOutput: ${outputPath}`);
console.log(`  ${lines} lines, ${(output.length / 1024).toFixed(1)}KB`);
console.log(`  (was ${html.split("\n").length} lines, ${(html.length / 1024).toFixed(1)}KB)`);
console.log(`\nfile://${outputPath}`);
