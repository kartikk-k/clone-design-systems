/**
 * HTML Processor — processes a self-contained inlined HTML file
 * (from power.js or similar) into a clean format for design extraction.
 *
 * Steps:
 * 1. Strip all <script> tags (don't affect rendering)
 * 2. Keep all <style> tags (Tailwind, CSS-in-JS, etc.)
 * 3. Parse CSS rules from <style> tags
 * 4. Walk DOM elements and resolve computed styles
 * 5. Output: clean HTML with all styles inlined on each element
 */

import { extractCSSRules, resolveStyles, type CSSRule } from "./css-resolver.ts";

/**
 * Process an inlined HTML file: strip scripts, resolve CSS to inline styles.
 * Returns clean HTML with computed styles on every element.
 */
export function processInlinedHTML(html: string): {
  cleanHtml: string;
  cssRules: CSSRule[];
  title: string;
  bodyClasses: string[];
} {
  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = titleMatch ? titleMatch[1]!.trim() : "Untitled";

  // Extract body classes
  const bodyMatch = html.match(/<body[^>]*class="([^"]*)"[^>]*>/i);
  const bodyClasses = bodyMatch ? bodyMatch[1]!.split(/\s+/).filter(Boolean) : [];

  // Step 1: Strip <script> tags FIRST — they contain JS with {} blocks
  // that the CSS parser would incorrectly parse as CSS rules
  let clean = html.replace(/<script[\s\S]*?<\/script>/gi, "");

  // Step 2: Parse CSS rules from <style> tags in the cleaned HTML
  const cssRules = extractCSSRules(clean);
  console.log(`  [html-processor] Extracted ${cssRules.length} CSS rules`);

  // Step 3: Strip <style> tags from body (rules already parsed)
  // Keep them in the output for now — they might be needed for Tailwind utility classes
  // that can't be easily resolved to inline styles

  return {
    cleanHtml: clean,
    cssRules,
    title,
    bodyClasses,
  };
}

/**
 * Walk all elements in the HTML and resolve their complete computed styles
 * from CSS rules + inline styles + class-based rules.
 *
 * Returns a map of element selectors/paths to their resolved styles.
 */
export function resolveAllStyles(
  html: string,
  cssRules: CSSRule[]
): Map<string, Record<string, string>> {
  const styleMap = new Map<string, Record<string, string>>();

  // Find all elements with class attributes
  const elementRegex = /<([a-z][a-z0-9-]*)\b([^>]*)>/gi;
  let match;
  let idx = 0;

  while ((match = elementRegex.exec(html)) !== null) {
    const tag = match[1]!;
    const attrs = match[2]!;

    // Skip void/meta elements
    if (["meta", "link", "br", "hr", "img", "input", "source"].includes(tag.toLowerCase())) continue;

    // Extract classes
    const classMatch = attrs.match(/class="([^"]*)"/);
    const classes = classMatch ? classMatch[1]!.split(/\s+/).filter(Boolean) : [];

    // Extract inline style
    const styleMatch = attrs.match(/style="([^"]*)"/);
    const inlineStyle = styleMatch ? styleMatch[1] : undefined;

    // Extract ID
    const idMatch = attrs.match(/id="([^"]*)"/);
    const id = idMatch ? idMatch[1] : undefined;

    // Only resolve if element has classes or inline styles
    if (classes.length > 0 || inlineStyle) {
      const resolved = resolveStyles(cssRules, tag, classes, inlineStyle, id);
      const key = `${tag}.${classes.join(".")}#${idx}`;
      styleMap.set(key, resolved);
    }

    idx++;
  }

  return styleMap;
}

/**
 * Strip scripts and clean up the HTML for design extraction.
 * This is the lightweight version — just removes scripts and
 * cleans up the HTML without full style resolution.
 */
export function stripAndClean(html: string): string {
  // Remove all script tags
  let clean = html.replace(/<script[\s\S]*?<\/script>/gi, "");

  // Remove browser extension artifacts
  clean = clean.replace(/<plasmo-csui[^>]*><\/plasmo-csui>/gi, "");
  clean = clean.replace(/<!--\[if[^>]*>[\s\S]*?<!\[endif\]-->/gi, "");

  // Remove noscript
  clean = clean.replace(/<noscript[\s\S]*?<\/noscript>/gi, "");

  return clean;
}

/**
 * Extract design-relevant data from a processed HTML file.
 * Returns structured data about colors, typography, spacing, components.
 */
export function extractDesignData(html: string, cssRules: CSSRule[]) {
  const data = {
    colors: new Set<string>(),
    fonts: new Set<string>(),
    fontSizes: new Set<string>(),
    borderRadii: new Set<string>(),
    shadows: new Set<string>(),
    gradients: new Set<string>(),
  };

  for (const rule of cssRules) {
    for (const [prop, val] of Object.entries(rule.properties)) {
      // Colors
      if (prop === "color" || prop === "background-color" || prop.includes("border") && prop.includes("color")) {
        if (val.match(/^(rgb|hsl|#)/i) && val !== "transparent") {
          data.colors.add(val);
        }
      }

      // Fonts
      if (prop === "font-family") {
        data.fonts.add(val);
      }

      // Font sizes
      if (prop === "font-size") {
        data.fontSizes.add(val);
      }

      // Border radius
      if (prop.includes("border") && prop.includes("radius")) {
        if (val !== "0" && val !== "0px") data.borderRadii.add(val);
      }

      // Shadows
      if (prop === "box-shadow" && val !== "none") {
        data.shadows.add(val);
      }

      // Gradients
      if (prop === "background-image" && val.includes("gradient")) {
        data.gradients.add(val);
      }
      if (prop === "background" && val.includes("gradient")) {
        data.gradients.add(val);
      }
    }
  }

  return {
    colors: [...data.colors],
    fonts: [...data.fonts],
    fontSizes: [...data.fontSizes].sort((a, b) => parseFloat(a) - parseFloat(b)),
    borderRadii: [...data.borderRadii],
    shadows: [...data.shadows],
    gradients: [...data.gradients],
  };
}
