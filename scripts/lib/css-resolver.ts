/**
 * CSS Resolver — extracts computed styles from an inlined HTML file.
 *
 * Takes a self-contained HTML file (all stylesheets inlined as <style> tags)
 * and resolves the computed styles for any element by matching CSS selectors.
 *
 * This replaces the need for a browser's getComputedStyle() — works offline
 * on the static HTML captured by power.js.
 */

export interface CSSRule {
  selector: string;
  properties: Record<string, string>;
  specificity: number;
}

export interface ResolvedComponent {
  tag: string;
  classes: string[];
  text: string;
  styles: Record<string, string>;
  children: ResolvedComponent[];
}

/**
 * Extract all CSS rules from <style> tags in an HTML string.
 */
export function extractCSSRules(html: string): CSSRule[] {
  const rules: CSSRule[] = [];

  // Extract all <style> tag contents
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let match;
  while ((match = styleRegex.exec(html)) !== null) {
    const css = match[1]!;
    parseCSS(css, rules);
  }

  return rules;
}

/**
 * Parse CSS text into rules array.
 */
function parseCSS(css: string, rules: CSSRule[]): void {
  // Remove comments
  css = css.replace(/\/\*[\s\S]*?\*\//g, "");

  // Handle @media, @keyframes etc — skip @keyframes, process @media contents
  css = css.replace(/@keyframes\s+[^{]+\{[^}]*(\{[^}]*\}[^}]*)*\}/g, "");
  css = css.replace(/@font-face\s*\{[^}]+\}/g, "");

  // Flatten @media — keep rules inside (we ignore media conditions for simplicity)
  css = css.replace(/@media[^{]+\{([\s\S]*?)\}\s*\}/g, "$1");

  // Parse individual rules
  const ruleRegex = /([^{}]+)\{([^}]+)\}/g;
  let ruleMatch;
  while ((ruleMatch = ruleRegex.exec(css)) !== null) {
    const selectorGroup = ruleMatch[1]!.trim();
    const body = ruleMatch[2]!.trim();

    if (!selectorGroup || selectorGroup.startsWith("@")) continue;

    const properties: Record<string, string> = {};
    for (const decl of body.split(";")) {
      const colonIdx = decl.indexOf(":");
      if (colonIdx === -1) continue;
      const prop = decl.substring(0, colonIdx).trim();
      const val = decl.substring(colonIdx + 1).trim();
      if (prop && val && !prop.startsWith("--")) {
        properties[prop] = val;
      }
    }

    if (Object.keys(properties).length === 0) continue;

    // Split comma-separated selectors
    for (const sel of selectorGroup.split(",")) {
      const selector = sel.trim();
      if (!selector) continue;
      rules.push({
        selector,
        properties,
        specificity: calculateSpecificity(selector),
      });
    }
  }
}

/**
 * Calculate CSS specificity for a selector.
 * Returns a single number for comparison (higher = more specific).
 */
function calculateSpecificity(selector: string): number {
  let ids = 0;
  let classes = 0;
  let elements = 0;

  // Count IDs
  ids += (selector.match(/#/g) || []).length;

  // Count classes, attributes, pseudo-classes
  classes += (selector.match(/\./g) || []).length;
  classes += (selector.match(/\[/g) || []).length;
  classes += (selector.match(/:/g) || []).length;
  // Subtract pseudo-elements (::)
  classes -= (selector.match(/::/g) || []).length;

  // Count element names
  const cleaned = selector
    .replace(/#[a-zA-Z0-9_-]+/g, "")
    .replace(/\.[a-zA-Z0-9_-]+/g, "")
    .replace(/\[[^\]]+\]/g, "")
    .replace(/:[a-zA-Z-]+(\([^)]*\))?/g, "")
    .replace(/::[a-zA-Z-]+/g, "")
    .replace(/[>+~ ]+/g, " ")
    .trim();
  elements += cleaned.split(/\s+/).filter((s) => s && s !== "*").length;

  return ids * 10000 + classes * 100 + elements;
}

/**
 * Check if a CSS selector matches an element described by tag + classes.
 * Simplified matcher — handles basic selectors (.class, tag, tag.class, :where(.class)).
 */
export function selectorMatches(
  selector: string,
  tag: string,
  classes: string[],
  id?: string
): boolean {
  // Remove :where() wrapper — treat contents as regular selectors
  let sel = selector.replace(/:where\(([^)]+)\)/g, "$1");

  // Remove pseudo-elements and pseudo-classes for matching
  sel = sel.replace(/::[a-zA-Z-]+/g, "");
  sel = sel.replace(/:(hover|focus|active|visited|first-child|last-child|nth-child\([^)]+\)|not\([^)]+\)|disabled)[a-zA-Z-]*/gi, "");

  // Take the last part of descendant/child selectors
  const parts = sel.split(/[\s>+~]+/);
  const lastPart = parts[parts.length - 1]!.trim();

  if (!lastPart) return false;

  // Parse the last selector part
  const tagMatch = lastPart.match(/^([a-zA-Z][a-zA-Z0-9-]*)/);
  const classMatches = lastPart.match(/\.([a-zA-Z0-9_-]+)/g);
  const idMatch = lastPart.match(/#([a-zA-Z0-9_-]+)/);

  // Check tag
  if (tagMatch && tagMatch[1]!.toLowerCase() !== tag.toLowerCase() && tagMatch[1] !== "*") {
    return false;
  }

  // Check ID
  if (idMatch && idMatch[1] !== id) {
    return false;
  }

  // Check classes
  if (classMatches) {
    for (const cls of classMatches) {
      const className = cls.substring(1); // remove the dot
      if (!classes.includes(className)) return false;
    }
  }

  return true;
}

/**
 * Resolve all styles for an element given its tag, classes, and inline styles.
 * Returns merged properties from all matching CSS rules + inline styles.
 */
export function resolveStyles(
  rules: CSSRule[],
  tag: string,
  classes: string[],
  inlineStyle?: string,
  id?: string
): Record<string, string> {
  // Find all matching rules
  const matching = rules
    .filter((r) => selectorMatches(r.selector, tag, classes, id))
    .sort((a, b) => a.specificity - b.specificity);

  // Merge by specificity (later / higher specificity wins)
  const result: Record<string, string> = {};
  for (const rule of matching) {
    for (const [prop, val] of Object.entries(rule.properties)) {
      result[prop] = val;
    }
  }

  // Inline styles override everything
  if (inlineStyle) {
    for (const decl of inlineStyle.split(";")) {
      const colonIdx = decl.indexOf(":");
      if (colonIdx === -1) continue;
      const prop = decl.substring(0, colonIdx).trim();
      const val = decl.substring(colonIdx + 1).trim();
      if (prop && val) result[prop] = val;
    }
  }

  return result;
}

/**
 * Extract key UI components from the HTML with their resolved styles.
 * Finds buttons, cards, inputs, headings, nav items etc.
 */
export function extractComponents(
  html: string,
  rules: CSSRule[]
): Record<string, ResolvedComponent[]> {
  const components: Record<string, ResolvedComponent[]> = {};

  // Find buttons
  components.buttons = findElementsByPattern(html, rules, [
    { tagPattern: "button", classPattern: undefined },
    { tagPattern: "a", classPattern: /button|btn|cta/i },
  ]);

  // Find cards
  components.cards = findElementsByPattern(html, rules, [
    { tagPattern: undefined, classPattern: /card/i },
  ]);

  // Find inputs
  components.inputs = findElementsByPattern(html, rules, [
    { tagPattern: "input", classPattern: undefined },
    { tagPattern: "textarea", classPattern: undefined },
  ]);

  // Find headings
  components.headings = findElementsByPattern(html, rules, [
    { tagPattern: "h1", classPattern: undefined },
    { tagPattern: "h2", classPattern: undefined },
    { tagPattern: "h3", classPattern: undefined },
  ]);

  return components;
}

interface ElementPattern {
  tagPattern?: string;
  classPattern?: RegExp;
}

function findElementsByPattern(
  html: string,
  rules: CSSRule[],
  patterns: ElementPattern[]
): ResolvedComponent[] {
  const results: ResolvedComponent[] = [];

  for (const pattern of patterns) {
    // Build regex to find elements
    let regex: RegExp;
    if (pattern.tagPattern && pattern.classPattern) {
      regex = new RegExp(
        `<${pattern.tagPattern}\\b[^>]*class="([^"]*${pattern.classPattern.source}[^"]*)"[^>]*>`,
        "gi"
      );
    } else if (pattern.tagPattern) {
      regex = new RegExp(`<${pattern.tagPattern}\\b([^>]*)>`, "gi");
    } else if (pattern.classPattern) {
      regex = new RegExp(
        `<([a-z][a-z0-9-]*)\\b[^>]*class="([^"]*${pattern.classPattern.source}[^"]*)"[^>]*>`,
        "gi"
      );
    } else {
      continue;
    }

    let match;
    while ((match = regex.exec(html)) !== null) {
      const fullTag = match[0]!;
      const tag = pattern.tagPattern || fullTag.match(/<([a-z][a-z0-9-]*)/i)?.[1] || "div";

      // Extract classes
      const classMatch = fullTag.match(/class="([^"]*)"/);
      const classes = classMatch ? classMatch[1]!.split(/\s+/).filter(Boolean) : [];

      // Extract inline style
      const styleMatch = fullTag.match(/style="([^"]*)"/);
      const inlineStyle = styleMatch ? styleMatch[1] : undefined;

      // Extract ID
      const idMatch = fullTag.match(/id="([^"]*)"/);
      const id = idMatch ? idMatch[1] : undefined;

      // Resolve styles
      const styles = resolveStyles(rules, tag, classes, inlineStyle, id);

      // Extract inner text (simplified — first text content)
      const afterTag = html.substring(match.index! + fullTag.length);
      const closeIdx = afterTag.indexOf(`</${tag}`);
      const inner = closeIdx > -1 ? afterTag.substring(0, closeIdx) : "";
      const text = inner.replace(/<[^>]+>/g, "").trim().substring(0, 100);

      results.push({ tag, classes, text, styles, children: [] });

      // Limit per pattern
      if (results.length > 20) break;
    }
  }

  return results;
}
