/**
 * CSS Tree-Shaker — removes unused CSS rules from a component's stylesheet.
 *
 * Given a chunk of HTML and a full CSS string, returns only the CSS rules
 * that could possibly apply to elements in that HTML. Also resolves
 * CSS variable references to include only used variables.
 */

/**
 * Extract all class names, tag names, and IDs used in an HTML string.
 */
function extractUsedSelectors(html: string): {
  classes: Set<string>;
  tags: Set<string>;
  ids: Set<string>;
} {
  const classes = new Set<string>();
  const tags = new Set<string>();
  const ids = new Set<string>();

  // Extract classes
  const classRegex = /class="([^"]*)"/gi;
  let m: RegExpExecArray | null;
  while ((m = classRegex.exec(html)) !== null) {
    m[1]!.split(/\s+/).filter(Boolean).forEach((c) => classes.add(c));
  }

  // Extract tag names
  const tagRegex = /<([a-z][a-z0-9-]*)\b/gi;
  while ((m = tagRegex.exec(html)) !== null) {
    tags.add(m[1]!.toLowerCase());
  }

  // Extract IDs
  const idRegex = /id="([^"]*)"/gi;
  while ((m = idRegex.exec(html)) !== null) {
    ids.add(m[1]!);
  }

  return { classes, tags, ids };
}

/**
 * Check if a CSS selector could match any element described by the used selectors.
 */
function selectorCouldMatch(
  selector: string,
  used: { classes: Set<string>; tags: Set<string>; ids: Set<string> }
): boolean {
  // Universal selectors always match
  if (selector.trim() === "*") return true;

  // :root, html, body — always include
  if (/^(:root|html|body)\b/.test(selector.trim())) return true;

  // Strip pseudo-elements and pseudo-classes for matching
  let sel = selector;
  sel = sel.replace(/::[a-zA-Z-]+(\([^)]*\))?/g, "");
  sel = sel.replace(/:(hover|focus|active|visited|disabled|first-child|last-child|nth-child\([^)]+\)|not\([^)]+\)|where\([^)]*\)|is\([^)]*\))[a-zA-Z-]*/gi, "");

  // For descendant/child selectors, check the LAST part (the target element)
  // but also check if ANY part matches (ancestor could be in the component)
  const parts = sel.split(/[\s>+~]+/).filter(Boolean);

  for (const part of parts) {
    // Check classes in this selector part
    const classMatches = part.match(/\.([a-zA-Z0-9_-]+)/g);
    if (classMatches) {
      const allClassesMatch = classMatches.every((cls) => used.classes.has(cls.substring(1)));
      if (allClassesMatch) return true;
    }

    // Check tag names
    const tagMatch = part.match(/^([a-z][a-z0-9-]*)/i);
    if (tagMatch && used.tags.has(tagMatch[1]!.toLowerCase())) {
      // Tag matches — if no class constraint, this rule applies
      if (!classMatches || classMatches.length === 0) return true;
    }

    // Check IDs
    const idMatch = part.match(/#([a-zA-Z0-9_-]+)/);
    if (idMatch && used.ids.has(idMatch[1]!)) return true;
  }

  // Check :where() and :is() contents
  const whereMatches = selector.match(/:(?:where|is)\(([^)]+)\)/g);
  if (whereMatches) {
    for (const w of whereMatches) {
      const inner = w.match(/:(?:where|is)\(([^)]+)\)/)?.[1] || "";
      for (const innerSel of inner.split(",")) {
        const cls = innerSel.match(/\.([a-zA-Z0-9_-]+)/);
        if (cls && used.classes.has(cls[1]!)) return true;
      }
    }
  }

  return false;
}

/**
 * Extract CSS variable names used in a set of CSS property values.
 */
function extractUsedVariables(css: string): Set<string> {
  const vars = new Set<string>();
  const varRegex = /var\(\s*(--[a-zA-Z0-9_-]+)/g;
  let m: RegExpExecArray | null;
  while ((m = varRegex.exec(css)) !== null) {
    vars.add(m[1]!);
  }
  return vars;
}

/**
 * Tree-shake CSS: given component HTML and full CSS, return only used rules.
 * Uses a simple but reliable approach: split CSS into rule blocks,
 * check if the selector references any class/tag/id from the component.
 */
export function treeshakeCSS(componentHtml: string, fullCSS: string): string {
  const used = extractUsedSelectors(componentHtml);
  // Also always include body/html/root selectors
  used.tags.add("html");
  used.tags.add("body");

  const output: string[] = [];

  // Split CSS into top-level blocks using brace counting
  const blocks = splitCSSBlocks(fullCSS);

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    // @font-face — skip (too heavy, rarely needed for component preview)
    if (trimmed.startsWith("@font-face")) continue;

    // @keyframes — skip
    if (trimmed.startsWith("@keyframes") || trimmed.startsWith("@-webkit-keyframes")) continue;

    // @media / @supports / @layer — check inner rules
    if (/^@(media|supports|layer)/.test(trimmed)) {
      // Check if any inner selector matches
      if (blockReferencesUsed(trimmed, used)) {
        output.push(trimmed);
      }
      continue;
    }

    // Regular rule — check selector
    const braceIdx = trimmed.indexOf("{");
    if (braceIdx === -1) continue;
    const selector = trimmed.substring(0, braceIdx).trim();

    // :root / html / html.dark / .dark / * — always include (contains CSS variables)
    if (/^(:root|html|\.dark|\*|\[data-theme)/.test(selector) || selector.includes("--")) {
      output.push(trimmed);
      continue;
    }

    if (selectorCouldMatch(selector, used)) {
      output.push(trimmed);
    }
  }

  // Now tree-shake CSS variables: find which --vars are actually used
  const usedCSS = output.join("\n");
  const usedVars = resolveUsedVariables(usedCSS + " " + componentHtml, fullCSS);

  // Filter :root blocks to only keep used variables
  const finalOutput = output.map((block) => {
    const trimmed = block.trim();
    const braceIdx = trimmed.indexOf("{");
    if (braceIdx === -1) return block;
    const selector = trimmed.substring(0, braceIdx).trim();

    if (selector === ":root" || selector === "html" || selector === "*") {
      return filterVarBlock(block, usedVars);
    }
    return block;
  }).filter((b) => b.trim());

  return finalOutput.join("\n");
}

/**
 * Split CSS into top-level blocks (rules and @-rule blocks).
 * Handles minified CSS where rules are concatenated without whitespace.
 */
function splitCSSBlocks(css: string): string[] {
  const blocks: string[] = [];
  let i = 0;

  while (i < css.length) {
    // Skip whitespace
    while (i < css.length && /\s/.test(css[i]!)) i++;
    if (i >= css.length) break;

    const start = i;

    // Find the opening brace
    const braceIdx = css.indexOf("{", i);
    if (braceIdx === -1) break;

    // Count braces to find matching close
    let depth = 1;
    let j = braceIdx + 1;
    while (j < css.length && depth > 0) {
      if (css[j] === "{") depth++;
      else if (css[j] === "}") depth--;
      j++;
    }

    blocks.push(css.substring(start, j));
    i = j;
  }

  return blocks;
}

/**
 * Check if a CSS block (including @media blocks) references any used selectors.
 */
function blockReferencesUsed(
  block: string,
  used: { classes: Set<string>; tags: Set<string>; ids: Set<string> }
): boolean {
  // Check if any class name from the component appears in this block
  for (const cls of used.classes) {
    if (block.includes("." + cls)) return true;
  }
  // Check tag names (less reliable, but catches basic resets)
  for (const tag of used.tags) {
    if (block.includes(tag + " ") || block.includes(tag + "{") || block.includes(tag + ",") || block.includes(tag + ":") || block.includes(tag + ".")) return true;
  }
  return false;
}

/**
 * Resolve all CSS variables transitively used by the component.
 */
function resolveUsedVariables(usedCSS: string, fullCSS: string): Set<string> {
  let vars = extractUsedVariables(usedCSS);
  let prevSize = 0;

  // Iterate until no new variables are discovered
  while (vars.size !== prevSize) {
    prevSize = vars.size;
    const varDefRegex = /(--[a-zA-Z0-9_-]+)\s*:\s*([^;]+)/g;
    let m: RegExpExecArray | null;
    while ((m = varDefRegex.exec(fullCSS)) !== null) {
      if (vars.has(m[1]!)) {
        extractUsedVariables(m[2]!).forEach((v) => vars.add(v));
      }
    }
  }

  return vars;
}

/**
 * Filter a :root { } block to only keep used variable definitions.
 */
function filterVarBlock(block: string, usedVars: Set<string>): string {
  const braceStart = block.indexOf("{");
  const braceEnd = block.lastIndexOf("}");
  if (braceStart === -1 || braceEnd === -1) return block;

  const selector = block.substring(0, braceStart).trim();
  const body = block.substring(braceStart + 1, braceEnd);

  const kept: string[] = [];
  for (const decl of body.split(";")) {
    const trimmed = decl.trim();
    if (!trimmed) continue;

    const varMatch = trimmed.match(/^(--[a-zA-Z0-9_-]+)\s*:/);
    if (varMatch) {
      // Only keep if this variable is used
      if (usedVars.has(varMatch[1]!)) kept.push(trimmed);
    } else {
      // Non-variable declaration — keep if it's a useful property
      kept.push(trimmed);
    }
  }

  if (kept.length === 0) return "";
  return `${selector} { ${kept.join("; ")}; }`;
}

/**
 * Treeshake rules inside a @media or @supports block.
 */
function treeshakeInnerRules(
  inner: string,
  used: { classes: Set<string>; tags: Set<string>; ids: Set<string> }
): string {
  const output: string[] = [];
  const ruleRegex = /([^{}]+)\{([^}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = ruleRegex.exec(inner)) !== null) {
    const selector = m[1]!.trim();
    if (selectorCouldMatch(selector, used)) {
      output.push(m[0]);
    }
  }
  return output.join("\n");
}

/**
 * Find the closing brace that matches the first { found after position start.
 */
function findClosingBrace(css: string, start: number): number {
  let depth = 0;
  for (let i = start; i < css.length; i++) {
    if (css[i] === "{") depth++;
    if (css[i] === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return css.length - 1;
}

/**
 * Build a minimal standalone HTML file for a component.
 */
export function buildMinimalComponent(
  componentHtml: string,
  fullCSS: string,
  htmlAttrs: string = "",
  bodyAttrs: string = "",
  title: string = "Component"
): string {
  // Include html/body wrapper in the treeshake so their classes are matched too
  const fullHtml = `<html ${htmlAttrs}><body ${bodyAttrs}>${componentHtml}</body></html>`;
  const minCSS = treeshakeCSS(fullHtml, fullCSS);

  return `<!DOCTYPE html>
<html ${htmlAttrs}>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
${minCSS}
  </style>
</head>
<body ${bodyAttrs}>
  ${componentHtml}
</body>
</html>`;
}
